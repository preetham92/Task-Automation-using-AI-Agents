import requests
import base64
import os
import io
import sys

# Temporarily remove the current directory from the path to avoid name conflicts
original_path = sys.path[:]
sys.path = [p for p in sys.path if p != os.getcwd()]
import fitz  # This is PyMuPDF
sys.path = original_path

from pathlib import Path

OCR_API_URL = "https://dev.assisto.tech/rag/api/query"

def file_to_base64(file_path):
    extension = Path(file_path).suffix.lower()
    
    if extension == '.pdf':
        doc = fitz.open(file_path)
        page = doc.load_page(0)
        
        # Increase resolution to 3x (approx 216 DPI) or 4x (288 DPI)
        # 3.0 is usually the sweet spot for balance between quality and file size
        zoom = 3.0 
        mat = fitz.Matrix(zoom, zoom)
        
        # colorspace=fitz.csGRAY converts to grayscale to help OCR contrast
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        
        # Use PNG instead of JPG for lossless quality (better for OCR)
        img_data = pix.tobytes("png")
        doc.close()
        
        return base64.b64encode(img_data).decode("utf-8")
    
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def get_mime_type(file_path):
    extension = Path(file_path).suffix.lower()
    if extension == '.pdf':
        return 'image/jpeg'
    
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp'
    }
    return mime_types.get(extension, 'application/octet-stream')

def call_ocr_api(file_path, client_id, session_id):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    try:
        file_b64 = file_to_base64(file_path)
        mime_type = get_mime_type(file_path)
        
        payload = {
            "clientId": client_id,
            "sessionId": session_id,
            "message": "",
            "documentIds": [],
            "researchEnabled": False,
            "ocrEnabled": True,
            "imageBase64": file_b64,  
            "imageMimeType": mime_type
        }

        response = requests.post(
            OCR_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120 
        )
        response.raise_for_status()
        print("OCR Response:", response.json())
        return response.json()
        
    except Exception as e:
        print(f"Error during processing: {e}")
        raise

if __name__ == "__main__":
    # Test it with your file
    try:
        result = call_ocr_api("BoardingPass-Journey1-HQSJRF.pdf", "S_PREETHAM", "test_session")
        print("API Response:", result)
    except Exception as e:
        print(f"Final failure: {e}")