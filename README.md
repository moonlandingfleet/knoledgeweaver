#Knowledge Weaver

Knowledge Weaver is an advanced AI-powered application for creating and refining personality-based documents using various knowledge sources.

## Features

- Create and manage AI personas with distinct personalities and backgrounds
- Process multiple document formats (PDF, DOCX, XLSX, CSV, JSON, TXT, MD)
- Generate documents based on knowledge sourcesand persona characteristics
- Refine documents with user feedback
- Quality assessment and analytics
- Advanced pathway-based processing
- Feedback-driven improvement system

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Google Gemini API key:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
   ```

## Running the Application

Start the development server:
```
npm run dev
```

The application will be available at http://localhost:3001/

## Building for Production

To create a production build:
```
npm run build
```

To preview the production build:
```
npm run preview
```

## Advanced Features

### Knowledge Pathway Processing
- Process documents using specific numberedpathways (e.g., "1.2", "2.3")
- Select relevant information subsets for focused processing
- Rate and improve edits with feedback system

### Personality Development
- Feed personalities with diverse information sources
- Build moral compass through thematic analysis
- Track personality evolution over time

## Testing

Run unittests:
```
npm run test
```

Run tests with coverage:
```
npm run test:coverage
```

## Troubleshooting

### Port Conflicts
If port 3000 is in use, the application will automatically try another port (typically 3001).

### API Key IssuesMake sure you have a valid Google Gemini API key in your `.env` file.

## Technologies Used

- React with TypeScript
- Vite build tool
- Google Gemini API
- Tailwind CSS
- Various document processing libraries (pdf.js, mammoth, xlsx, etc.)

## License

This projectis licensed under the MIT License.
