# No-Code RAG Builder 

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://support-mvp-client.netlify.app)

A powerful, full-stack platform designed to democratize AI by allowing users to build, manage, and deploy **Retrieval-Augmented Generation (RAG)** pipelines without writing a single line of code.

##  Key Highlights

- **No-Code Pipeline Builder:** Intuitive drag-and-drop interface powered by **React Flow**, **Zustand**, and **ShadCN UI**.
- **Advanced Document Processing:** Seamless ingestion of PDFs and DOCX files using `pdfplumber`, `python-docx`, and `docx2txt`.
- **Hybrid Vector Storage:** Integrated support for high-performance vector databases like **Pinecone** and **ChromaDB**.
- **Secure Architecture:** Enterprise-ready authentication and authorization powered by **JWT** and **FastAPI**.
- **Modular RAG Logic:** Built on top of **LangChain** and **OpenAI** for state-of-the-art LLM orchestration.
- **Cloud Native:** Robust file handling and storage utilizing **AWS S3**.
- **Monetization Ready:** Built-in billing logic and webhook integrations for scaling your MVP.

## 🛠 Tech Stack

| Category | Tools & Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Zustand, Tailwind CSS, ShadCN UI |
| **Backend** | Python FastAPI, Node.js + Express, MongoDB, SQLAlchemy |
| **AI / RAG** | LangChain, OpenAI API, Pinecone, ChromaDB |
| **Infrastructure** | AWS S3, JWT Auth, Python document processing libs |

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- API Keys for OpenAI & Pinecone

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Nickk91/Support-MVP.git](https://github.com/Nickk91/Support-MVP.git)
   cd Support-MVP

   Backend Setup:

Bash
cd backend
pip install -r requirements.txt
# Ensure your .env file is configured with your API credentials
python main.py
Frontend Setup:

Bash
cd frontend
npm install
npm run dev

License
This project is licensed under the MIT License - see the LICENSE file for details.

 Attribution & Contact
Nikolay Kaploon Project Link: https://github.com/Nickk91/Support-MVP/

Live Demo: Support-MVP Client

If you use this code in your own projects or research, please provide acknowledgment by linking back to this repository or citing the author.
