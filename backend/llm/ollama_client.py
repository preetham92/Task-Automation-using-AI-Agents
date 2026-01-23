import requests
import time
import traceback

OLLAMA_URL = "https://dev.assisto.tech/ollama/api/generate"
MODEL = "qwen3:8b"


def call_llm(prompt, retries=2, timeout=120):
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

            # Always log basics
            print(f"[Attempt {attempt}] HTTP {response.status_code}")

            response.raise_for_status()

            print("[RAW RESPONSE]")
            print(response.text)

            data = response.json()

            if data.get("response"):
                return data["response"]

            raise RuntimeError(f"No 'response' field in JSON: {data}")

        except Exception as e:
            print("\n===== LLM ERROR =====")
            print("Exception:", repr(e))
            traceback.print_exc()
            print("=====================\n")

            last_error = e
            if attempt < retries:
                time.sleep(2)

    raise RuntimeError(f"LLM failed after retries: {last_error}")


# 🔽🔽🔽 CALL BLOCK 🔽🔽🔽
if __name__ == "_main_":
    try:
        prompt = "Say hello in one sentence"
        result = call_llm(prompt)
        print("\n===== LLM OUTPUT =====")
        print(result)
        print("======================")
    except Exception as e:
        print("\n===== FINAL FAILURE =====")
        print(repr(e))
        traceback.print_exc()
        print("=========================")