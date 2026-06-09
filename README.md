
# Task Automation using AI Agents

## Overview

This project implements an **AI-driven task automation system** using a multi-agent architecture. It automates document ingestion, OCR, validation, summarization, and orchestration of workflows, with a **Python-based backend** and a **modern React (Vite + TypeScript) frontend**.

The system is designed to simulate real-world enterprise automation scenarios such as expense claim processing, audit validation, and intelligent document handling.
=======
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
>>>>>>> 564fa4560773a75a37ceb8c2a7b18214bae0fc75

---

## Project Structure
<<<<<<< HEAD

```
Task Automation using AI Agents/
│
├── backend/
│   ├── agents/                # Specialized AI agents
│   │   ├── ingestion_agent.py
│   │   ├── extraction_agent.py
│   │   ├── validation_agent.py
│   │   ├── summary_agent.py
│   │   └── exception_agent.py
│   │
│   ├── llm/                   # LLM integration
│   │   └── ollama_client.py
│   │
│   ├── ocr/                   # OCR services
│   │   └── ocr_api_client.py
│   │
│   ├── data/                  # Sample input data
│   │   ├── input_docs/
│   │   └── expense_claims.csv
│   │
│   ├── main.py                # Entry point
│   ├── orchestrator.py        # Agent coordination logic
│   ├── server.py              # Backend API server
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/                   # React application source
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── .gitignore
=======
```
travel-ai-agents/
├── agents/
├── ocr/
├── llm/
├── data/
├── main.py
├── requirements.txt
>>>>>>> 564fa4560773a75a37ceb8c2a7b18214bae0fc75
└── README.md
```

---

<<<<<<< HEAD
## Backend Details

### Technologies

* Python 3.10+
* FastAPI / Flask-style server
* Modular AI agent architecture
* OCR integration
* LLM integration (Ollama-compatible)

### Key Concepts

* **Agent-based design**: Each agent handles a specific responsibility
* **Orchestrator**: Coordinates agent execution and data flow
* **Pluggable LLM & OCR layers**

### Setup & Run (Backend)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
=======
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
>>>>>>> 564fa4560773a75a37ceb8c2a7b18214bae0fc75
pip install -r requirements.txt
python main.py
```

<<<<<<< HEAD
Backend will start on the configured local port.

---

## Frontend Details

### Technologies

* React + TypeScript
* Vite
* Tailwind CSS
* Modern component-based UI

### Features

* Role-based layouts (Employee / Financier)
* Dashboard views
* Status tracking and audit logs
* Responsive UI

### Setup & Run (Frontend)

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at:

```
http://localhost:5173
```

---

## Workflow Overview

1. **Document Upload / Input**
2. **Ingestion Agent** processes raw input
3. **Extraction Agent** performs OCR and parsing
4. **Validation Agent** checks correctness and compliance
5. **Summary Agent** generates concise insights
6. **Exception Agent** handles errors or anomalies
7. **Orchestrator** manages sequencing and data flow
8. **Frontend** displays results and analytics

---

## Git & Repository Notes

* `node_modules/` and `.venv/` are intentionally ignored
* Only source code and essential configuration are versioned
* Clean commit history with no generated artifacts

---

## Use Cases

* Expense claim automation
* Document-based workflow processing
* AI-assisted auditing systems
* Multi-agent orchestration demos

---

## Future Enhancements

* Authentication & authorization
* Database integration
* Cloud deployment
* Advanced LLM routing
* Real-time document uploads


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

