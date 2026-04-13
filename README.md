# 🤖 RAG Interview Chatbot

A **Retrieval-Augmented Generation (RAG)** chatbot for interview preparation. Built with Node.js, Express, and vanilla HTML/CSS/JS.

## ✨ Features

- **RAG-powered answers** — Keyword + TF-IDF scoring retrieval from a local knowledge base
- **20 interview topics** — Covers Introduction, Behavioral, OOP, SQL, JavaScript, System Design
- **Dark glassmorphic UI** — Premium design with animations and gradient accents
- **Markdown rendering** — Code blocks, tables, bold, lists rendered in chat
- **Mobile-responsive** — Works on all screen sizes
- **OpenAI-ready** — Drop-in integration for GPT-powered responses
- **Vector DB blueprint** — Ready for Pinecone/ChromaDB upgrade

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# http://localhost:3000
```

## 📁 Project Structure

```
RAGbased InterviewBot/
├── server.js                    # Express server with API routes
├── package.json                 # Dependencies and scripts
├── knowledge.json               # Interview Q&A knowledge base
├── .env                         # Environment variables
├── public/                      # Frontend (served as static files)
│   ├── index.html               # Main HTML page
│   ├── css/style.css            # Dark theme stylesheet
│   └── js/app.js                # Chat application logic
└── services/
    ├── retriever.js             # RAG retrieval engine
    └── openai-integration.js    # OpenAI upgrade template
```

## 🔌 API Endpoints

| Method | Endpoint       | Description                    |
|--------|----------------|--------------------------------|
| POST   | `/api/chat`    | Send a message, get RAG answer |
| GET    | `/api/topics`  | List all available topics      |
| GET    | `/api/health`  | Server health check            |

## 🧠 How RAG Works Here

1. **User sends a question** → Frontend calls `/api/chat`
2. **Retrieval** → `retriever.js` scores every knowledge base entry using:
   - Exact keyword match (weight: 10)
   - Token match (weight: 3)
   - Question similarity (weight: 2)
   - Bigram phrase match (weight: 5)
3. **Best match returned** → If score ≥ threshold, return the answer
4. **Fallback** → If no match, suggest available topics

## 🔧 OpenAI Upgrade

To enable GPT-powered responses:

1. Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Add to `.env`: `OPENAI_API_KEY=sk-...`
3. Install: `npm install openai`
4. Uncomment code in `services/openai-integration.js`
5. Update `server.js` to use the OpenAI service

## 📝 License

MIT
