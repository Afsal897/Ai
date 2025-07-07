# 📄 Resume Extractor Web App

This is a full-stack application that lets users upload resumes (PDF format), automatically extracts information using cosine similarity and semantic search, and displays the data in a form for review and submission.

---

## 🧰 Tech Stack

### 🔹 Frontend
- ⚛️ React (with TypeScript)
- 💄 Bootstrap 5
- 📦 Vite

### 🔸 Backend
- ⚡ FastAPI
- 🧠 sentence-transformers (`intfloat/e5-small-v2`) for semantic search
- 📄 pdfplumber for PDF text extraction

---

## 🎯 Features

- Upload resume in PDF format
- Extracts:
  - Name, Email, Phone
  - Summary, Skills, Experience, Education, etc.
- Fills out a dynamic form with extracted data
- Allows manual edits before submission
- Sends data to backend for storage or processing

---

## 📁 Project Structure


├── backend/
│ ├── app/
│ │ ├── api/
│ │ ├── services/
│ │ └── main.py
│ └── venv/
├── frontend/
│ ├── src/
│ │ ├── Home.tsx
│ │ ├── App.tsx
│ │ └── main.tsx
│ └── index.html
├── .gitignore
└── README.md