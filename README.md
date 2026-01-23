# Task Automation using AI Agents

## Overview

This project implements an **AI-driven task automation system** using a multi-agent architecture. It automates document ingestion, OCR, validation, summarization, and orchestration of workflows, with a **Python-based backend** and a **modern React (Vite + TypeScript) frontend**.

The system is designed to simulate real-world enterprise automation scenarios such as expense claim processing, audit validation, and intelligent document handling.

---

## Project Structure

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
└── README.md
```

---

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
pip install -r requirements.txt
python main.py
```

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

Just tell me what you need.
