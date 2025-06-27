# ServiceVision.net - SaaS Landing Page & AI Consulting Agent

## Overview

ServiceVision is a dual-mission business and technology consulting firm that combines for-profit consulting services with nonprofit community support. This repository contains the landing page and AI-powered consulting agent for ServiceVision.net.

## Architecture

```
servicevisionsite/
├── frontend/          # Vue.js 3 application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── dist/         # Build output
├── backend/          # Node.js Express API
│   ├── src/          # Source code
│   ├── config/       # Configuration files
│   └── tests/        # Unit and integration tests
└── database/         # Database schemas and migrations
```

## Tech Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Tailwind CSS** - Utility-first CSS framework
- **Pinia** - State management
- **Vite** - Build tool
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Sequelize** - ORM for database operations
- **OpenAI API** - AI/LLM integration
- **SendGrid** - Email delivery
### Infrastructure
- **Vercel** - Frontend hosting
- **Railway** - Backend hosting
- **Supabase** - PostgreSQL database
- **Upstash Redis** - Session storage (optional)
- **OpenAI API** - AI chat functionality

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- SendGrid account
- Calendly account
- Database (PostgreSQL, MySQL, or SQL Server)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/servicevision/servicevisionsite.git
cd servicevisionsite
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Install frontend dependencies
```bash
cd ../frontend
npm install
```
## Configuration

### Backend Configuration
Create `backend/config/appsettings.json`:
```json
{
  "Database": {
    "ConnectionString": "your-connection-string"
  },
  "OpenAI": {
    "ApiKey": "sk-your-openai-api-key"
  },
  "SendGrid": {
    "ApiKey": "your-sendgrid-key"
  },
  "Calendly": {
    "ApiKey": "your-calendly-key"
  }
}
```

### Frontend Configuration
Create `frontend/.env`:
```
VITE_API_URL=http://localhost:3000
VITE_CALENDLY_URL=your-calendly-url
```

## Development

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd frontend
npm run dev
```

## Deployment

See deployment guide in `/docs/deployment.md`

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.