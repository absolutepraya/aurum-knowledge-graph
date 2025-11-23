# Knowledge Graph - Historic Art

This project implements a Knowledge Graph for historic art using Neo4j and Next.js.

## Getting Started

### 1. Prerequisites

- Node.js (v18+)
- Neo4j Database (Desktop or Aura)

### 2. Installation

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your Neo4j credentials in `.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

### 4. Database Seeding

Populate your Neo4j database with the initial dataset:

```bash
npm run seed
```

### 5. Run the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
