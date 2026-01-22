import json
import uuid
from ocr.ocr_api_client import call_ocr_api
from llm.ollama_client import call_llm

# move to .env later
CLIENT_ID = "assisto-demo-client"
SESSION_ID = str(uuid.uuid4())

MAX_CHARS = 3000
LLM_RETRIES = 2


def extraction_agent(file_path, doc_type):
    """
    Extraction Agent:
    1. Calls OCR API to convert document to text
    2. Uses LLM to extract structured travel data
    3. Handles OCR / LLM failures gracefully
    """


    try:
        ocr_response = call_ocr_api(file_path, CLIENT_ID, SESSION_ID)

        raw_text = (
            ocr_response.get("answer")
            or ocr_response.get("response")
            or ocr_response.get("data")
            or ""
        )

        if not raw_text.strip():
            raise ValueError("OCR returned empty text")

        
        raw_text = raw_text[:MAX_CHARS]

    except Exception as e:
        return {
            "doc_type": doc_type,
            "error": f"OCR failed: {str(e)}",
            "confidence": 0.0
        }

    
    prompt = f"""
You are a JSON extraction engine.

TASK:
Extract the following fields from the travel document text.

FIELDS (JSON keys):
- passenger_name
- ticket_number_or_pnr
- date
- time
- from_location
- to_location
- airline_or_train_name_or_any_other_provider
- fare_amount

STRICT RULES:
- Output ONLY a valid JSON object
- Do NOT include markdown
- Do NOT include explanations
- Do NOT include backticks
- If a value is missing, use null
- Numbers must be numbers, not strings

OUTPUT FORMAT (example):
{{
  "passenger_name": "...",
  "ticket_number_or_pnr": "...",
  "date": "...",
  "time": "...",
  "from_location": "...",
  "to_location": "...",
  "airline_or_train_name_or_any_other_provider": "...",
  "fare_amount": 0
}}

DOCUMENT TEXT:
{raw_text}
"""


    last_error = None

    for attempt in range(1, LLM_RETRIES + 1):
        try:
            llm_response = call_llm(prompt)
            data = json.loads(llm_response)

            data["doc_type"] = doc_type
            data["confidence"] = 0.9
            return data

        except Exception as e:
            last_error = str(e)
            if attempt < LLM_RETRIES:
                print(f"LLM attempt {attempt} failed, retrying...")
            else:
                break

    return {
        "doc_type": doc_type,
        "error": f"LLM extraction failed after retries: {last_error}",
        "confidence": 0.0
    }
