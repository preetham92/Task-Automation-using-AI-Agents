# Task-Automation-using-AI-Agents
# Automated Travel Expense Claim Processing using AI Agents

## Objective
This project demonstrates an **AI-agent–based automation system** for ingesting travel documents and extracting key journey details using **OCR and Large Language Models (LLMs)**.  
It is designed to assess the bidder’s ability to build **autonomous, API-driven AI agents** for repetitive back-office process automation.

The solution aligns with **Track 3: Task Automation using AI Agents**.

---

## Business Use Case
Employees submit travel expense claims along with scanned or digital copies of:
- Airline tickets
- Boarding passes
- Railway e-tickets (IRCTC format)
- Cab or taxi invoices

The AI Agent system automatically:
1. Detects document type
2. Performs OCR using an enterprise OCR API
3. Extracts journey details using an LLM
4. Produces structured, machine-readable outputs
5. Provides confidence scoring and full auditability

---

## Implemented Agents

### 1. Document Ingestion Agent
**Input**
- Folder or API containing PDF/JPEG/PNG travel documents

**Function**
- Detects document type:
  - Airline Ticket
  - Boarding Pass
  - Railway Ticket
  - Cab Invoice
- Routes documents to the next agent

**Output Example**
```json
{
  "file": "boarding_pass_01.pdf",
  "doc_type": "boarding_pass"
}
```

---

### 2. OCR Agent (API-Based)
**Input**
- Image or PDF document (Base64 encoded)

**Function**
- Uses a secure, cloud-hosted OCR API
- Converts documents into machine-readable markdown text
- Eliminates local OCR dependencies

**OCR API Endpoint**
```bash
POST https://dev.assisto.tech/rag/api/query
```

**Key Parameters**
- ocrEnabled: true
- imageBase64: Base64-encoded document
- imageMimeType: image/png | image/jpeg | application/pdf

---

### 3. Extraction & Validation Agent
**Input**
- OCR-generated text
- Detected document type

**Function**
- Uses LLM to extract structured travel information

**Extracted Fields**
- Passenger Name
- Ticket Number / PNR
- Date & Time
- From / To Location
- Airline Name/ Train name/ Cab name/Any Other Provider
- Fare Amount
- Confidence Score

---

## Architecture Flow
Employee Uploads Documents  
→ Document Ingestion Agent  
→ OCR Agent (API)  
→ Extraction & Validation Agent (LLM)  
→ Structured JSON Output  

---

## Project Structure
```
travel-ai-agents/
├── agents/
├── ocr/
├── llm/
├── data/
├── main.py
├── requirements.txt
└── README.md
```

---

## LLM Integration
**Endpoint**
```bash
POST https://dev.assisto.tech/ollama/api/generate
```

**Model**
```
qwen3:8b
```

---

## How to Run
```bash
pip install -r requirements.txt
python main.py
```

---

## Key Features
- Multi-agent workflow orchestration
- API-based OCR (no local dependencies)
- OCR + LLM document intelligence
- Modular and extensible architecture
- Structured JSON output
- Confidence scoring and transparent audit trail
- Enterprise-ready API integrations

---

## Security & Compliance
- Runs in a secure, cloud-hosted sandbox
- Uses synthetic or publicly available documents only
- No real personal or sensitive data processed
- Complete auditability through structured logs and outputs
