import litellm
from litellm import completion
from litellm.proxy import proxy_server
import sqlite3
import hashlib
import time
import logging
import os

logging.basicConfig(level=logging.INFO)

# SQLite Cache Setup
DB_PATH = "cache.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cursor = conn.cursor()
cursor.execute('''CREATE TABLE IF NOT EXISTS cache 
                  (hash TEXT PRIMARY KEY, response TEXT, timestamp REAL)''')
conn.commit()

def hash_prompt(messages, temperature):
    """Hash for caching: messages + temp."""
    prompt_str = str(messages) + str(temperature)
    return hashlib.sha256(prompt_str.encode()).hexdigest()

async def cached_completion(messages, model, temperature=0.7, stream=False):
    """Wrapper with caching."""
    cache_hash = hash_prompt(messages, temperature)
    cursor.execute("SELECT response FROM cache WHERE hash=?", (cache_hash,))
    cached = cursor.fetchone()
    
    if cached:
        logging.info("Cache hit!")
        if stream:
            # For stream, yield chunks (simulate from cached full response)
            full_resp = cached[0]
            for chunk in full_resp.split(' '):  # Simple chunking
                yield {'choices': [{'delta': {'content': chunk + ' '}}]}
        else:
            return {'choices': [{'message': {'content': cached[0]}}]}
    else:
        start_time = time.time()
        # Call local Ollama via LiteLLM
        response = await litellm.acompletion(
            model="ollama/llama3.2:1b",  # Or phi3:mini for variety
            messages=messages,
            temperature=temperature,
            stream=stream
        )
        if stream:
            async for chunk in response:
                yield chunk
        else:
            content = response['choices'][0]['message']['content']
            cursor.execute("INSERT OR REPLACE INTO cache (hash, response, timestamp) VALUES (?, ?, ?)",
                           (cache_hash, content, time.time()))
            conn.commit()
            logging.info(f"Cache miss - Time: {time.time() - start_time}s")
            return {'choices': [{'message': {'content': content}}]}

# Override LiteLLM's router with our cached version
litellm.completion = cached_completion  # Note: For async, use in proxy hooks if needed

# Pre-load model (warm up)
logging.info("Pre-loading model...")
completion(model="ollama/llama3.2:1b", messages=[{"role": "user", "content": "Warmup query"}])

# Start Proxy Server (mimics OpenAI/Gemini API)
os.environ["LITELLM_MASTER_KEY"] = ""  # No auth for local
proxy_server.main(
    api_base="http://localhost:11434",  # Ollama default
    port=8000,
    workers=1,  # Single for home use
    model_list=[{"model_name": "gemini-2.5-flash", "litellm_params": {"model": "ollama/llama3.2:1b"}}]  # Alias to local model
)
