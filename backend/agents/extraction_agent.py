import json
import uuid
import re
from ocr.ocr_api_client import call_ocr_api
from llm.ollama_client import call_llm

# move to .env later
CLIENT_ID = "assisto-demo-client"
SESSION_ID = str(uuid.uuid4())

MAX_CHARS = 3000
LLM_RETRIES = 2

def clean_and_parse_json(llm_output):
    """
    Robust JSON parser that handles:
    1. <think>...</think> blocks (from reasoning models)
    2. Markdown code blocks (```json ... ```)
    3. Trailing/leading whitespace
    """
    try:
        # 1. Remove <think> blocks if present
        cleaned_output = re.sub(r'<think>.*?</think>', '', llm_output, flags=re.DOTALL).strip()

        # 2. Extract JSON from Markdown code blocks
        json_match = re.search(r'```json\s*({.*?})\s*```', cleaned_output, re.DOTALL)
        if json_match:
            cleaned_output = json_match.group(1)
        else:
            # Fallback: Find the first '{' and the last '}'
            start = cleaned_output.find('{')
            end = cleaned_output.rfind('}') + 1
            if start != -1 and end != 0:
                cleaned_output = cleaned_output[start:end]

        # 3. Parse
        return json.loads(cleaned_output)

    except (json.JSONDecodeError, AttributeError) as e:
        print(f"JSON Parse Error: {e}")
        print(f"Faulty Output: {llm_output}") # Print raw output for debugging
        raise e

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
            # If OCR returns empty, we can't extract anything.
            # Don't crash, just return an error dict.
            return {
                "doc_type": doc_type,
                "error": "OCR returned empty text",
                "confidence": 0.0
            }
        
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
            
            # Use the new robust parser instead of json.loads directly
            data = clean_and_parse_json(llm_response)

            data["doc_type"] = doc_type
            data["confidence"] = 0.9
            return data

        except Exception as e:
            last_error = str(e)
            if attempt < LLM_RETRIES:
                print(f"LLM attempt {attempt} failed: {e}. Retrying...")
            else:
                break

    return {
        "doc_type": doc_type,
        "error": f"LLM extraction failed after retries: {last_error}",
        "confidence": 0.0
    }