# Knowledge Graph - Historic Art

This project implements a Knowledge Graph for historic art using Neo4j and Next.js.

## Getting Started

### 1. Prerequisites

- Node.js (v18+)
- Neo4j Database (Desktop or Aura)

### 2. Installation

```bash
bun install
```

### 3. Environment Setup

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your Neo4j credentials and OpenAI API Key in `.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
OPENAI_API_KEY=sk-...
```

### 4. Database Seeding & Enrichment

Populate your Neo4j database with the initial dataset:

```bash
bun run seed
```

Enrich the data with Wikidata relations:

```bash
bun run enrich
```

Generate vector embeddings for semantic search and chatbot:

```bash
bun run embed
```

### 5. Run the Application

Start the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- **Knowledge Graph**: Explore artists and artworks connected by relationships.
- **Semantic Search**: Search by meaning, not just keywords.
- **Museum Guide Chatbot**: Ask questions about the collection and get AI-generated answers based on the database.
- **Interactive Visualization**: Visual graph of artist connections.
