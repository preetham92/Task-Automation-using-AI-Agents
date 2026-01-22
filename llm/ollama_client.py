import requests
import time

OLLAMA_URL = "https://dev.assisto.tech/ollama/api/generate"
MODEL = "qwen3:8b"

def call_llm(prompt, retries=2, timeout=120):
    """
    Calls the Ollama LLM API with retry and timeout handling.
    Returns model response text or raises final exception.
    """

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }

    last_error = None

    for attempt in range(1, retries + 1):
        try:
            response = requests.post(
                OLLAMA_URL,
                json=payload,
                timeout=timeout
            )
            response.raise_for_status()

            data = response.json()

            
            if "response" in data and data["response"]:
                return data["response"]

            raise ValueError("Empty response from LLM")

        except Exception as e:
            last_error = e
            if attempt < retries:
                print(f"LLM call failed (attempt {attempt}), retrying...")
                time.sleep(2)
            else:
                break

    raise RuntimeError(f"LLM failed after retries: {last_error}")
