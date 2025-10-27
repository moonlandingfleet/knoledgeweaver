import { Source } from '../types';

// This is available globally from the script tag in index.html
declare const pdfjsLib: any;

// Configure the worker source for pdf.js to ensure it runs in a separate thread.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.mjs`;

// Import additional parsers (these would be imported when available)
const readDocxFile = async (file: File): Promise<string> => {
  try {
    // Dynamic import to handle potential missing library
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`DOCX parsing not available: ${error}`);
  }
};

const readXlsxFile = async (file: File): Promise<string> => {
  try {
    // Dynamic import to handle potential missing library
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let content = '';

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      content += `=== ${sheetName} ===\n`;
      content += XLSX.utils.sheet_to_csv(worksheet);
      content += '\n\n';
    });

    return content;
  } catch (error) {
    throw new Error(`XLSX parsing not available: ${error}`);
  }
};

const readCsvFile = async (file: File): Promise<string> => {
  try {
    // Dynamic import to handle potential missing library
    const Papa = await import('csv-parse');
    const text = await readTextFile(file);

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        skip_empty_lines: true,
        columns: false,
        delimiter: ','
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records.map((row: any[]) => row.join(', ')).join('\n'));
      });
    });
  } catch (error) {
    throw new Error(`CSV parsing not available: ${error}`);
  }
};

const readJsonFile = async (file: File): Promise<string> => {
  try {
    // Dynamic import to handle potential missing library
    const JSON5 = await import('json5');
    const text = await readTextFile(file);
    const parsed = JSON5.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    throw new Error(`JSON parsing not available: ${error}`);
  }
};

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

const readPdfFile = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    
    // If no text content found, add a note about it being a scanned document
    if (!pageText || pageText.trim().length === 0) {
      fullText += `[Note: Page ${i} appears to be a scanned image with no extractable text. Please ensure the PDF contains selectable text for proper processing.]\n\n`;
    } else {
      fullText += pageText + '\n\n'; // Add newlines to separate page content
    }
  }
  return fullText;
};

// File type configurations
const FILE_TYPE_CONFIG = {
  'application/pdf': { parser: readPdfFile, maxSize: 50 * 1024 * 1024 }, // 50MB
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { parser: readDocxFile, maxSize: 25 * 1024 * 1024 }, // 25MB
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { parser: readXlsxFile, maxSize: 25 * 1024 * 1024 }, // 25MB
  'text/csv': { parser: readCsvFile, maxSize: 10 * 1024 * 1024 }, // 10MB
  'application/json': { parser: readJsonFile, maxSize: 10 * 1024 * 1024 }, // 10MB
  'text/plain': { parser: readTextFile, maxSize: 10 * 1024 * 1024 }, // 10MB
  'text/markdown': { parser: readTextFile, maxSize: 10 * 1024 * 1024 }, // 10MB
} as const;

// Supported file extensions as fallback
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv', '.json', '.txt', '.md'];

const getFileType = (file: File): string => {
  // First check MIME type
  if (FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG]) {
    return file.type;
  }

  // Fallback to extension check
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (SUPPORTED_EXTENSIONS.includes(extension)) {
    switch (extension) {
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.csv': return 'text/csv';
      case '.json': return 'application/json';
      case '.txt': return 'text/plain';
      case '.md': return 'text/markdown';
      default: return '';
    }
  }

  return '';
};

export const parseFiles = async (
  files: FileList,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<Source[]> => {
  const parsedSources: Source[] = [];
  const fileArray = Array.from(files);

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];

    if (onProgress) {
      onProgress(i, fileArray.length, `Processing ${file.name}...`);
    }

    try {
      // File validation
      const fileType = getFileType(file);
      if (!fileType) {
        console.warn(`Unsupported file type: ${file.type || 'unknown'}. Skipping file: ${file.name}`);
        parsedSources.push({
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          content: `Error: Unsupported file type. Supported formats: PDF, DOCX, XLSX, CSV, JSON, TXT, MD`,
        });
        continue;
      }

      const config = FILE_TYPE_CONFIG[fileType as keyof typeof FILE_TYPE_CONFIG];
      if (file.size > config.maxSize) {
        console.warn(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size: ${(config.maxSize / 1024 / 1024).toFixed(0)}MB`);
        parsedSources.push({
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          content: `Error: File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size: ${(config.maxSize / 1024 / 1024).toFixed(0)}MB`,
        });
        continue;
      }

      // Parse the file
      const content = await config.parser(file);

      if (!content || content.trim().length === 0) {
        parsedSources.push({
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          content: `Warning: No readable content found in file. For PDF files, this may indicate a scanned document without selectable text.`,
        });
      } else {
        parsedSources.push({
          id: `${file.name}-${file.lastModified}`,
          name: file.name,
          content: content,
        });
      }

    } catch (error) {
      console.error(`Error parsing file ${file.name}:`, error);
      // Create a source with an error message to inform the user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      parsedSources.push({
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        content: `Error: ${errorMessage}`,
      });
    }
  }

  if (onProgress) {
    onProgress(fileArray.length, fileArray.length, 'Processing complete!');
  }

  return parsedSources;
};