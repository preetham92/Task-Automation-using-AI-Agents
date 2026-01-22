import requests
import base64

OCR_API_URL = "https://dev.assisto.tech/rag/api/query"

def image_to_base64(file_path):
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def call_ocr_api(file_path, client_id, session_id):
    image_b64 = image_to_base64(file_path)

    payload = {
        "clientId": client_id,
        "sessionId": session_id,
        "message": "",
        "documentIds": [],
        "researchEnabled": False,
        "ocrEnabled": True,
        "imageBase64": image_b64,
        "imageMimeType": "image/png"
    }

    response = requests.post(
        OCR_API_URL,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=60
    )

    response.raise_for_status()
    return response.json()
