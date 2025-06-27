# GitHub Repository Setup

## Creating the Repository

1. **Go to GitHub.com** and create a new repository:
   - Repository name: `servicevision`
   - Description: "AI-powered consulting platform with Vue.js frontend and Node.js backend"
   - Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

2. **Add the remote origin**:
   ```bash
   cd d:\dev2\servicevisionsite
   git remote add origin https://github.com/YOUR-USERNAME/servicevision.git
   git branch -M main
   git push -u origin main
   ```

## Repository Structure

```
servicevision/
├── frontend/          # Vue.js application (deployed to Vercel)
├── backend/           # Node.js API (deployed to Railway)
├── DEPLOYMENT.md      # Complete deployment guide
├── QUICKSTART.md      # Quick setup instructions
└── README.md          # Project overview
```

## Tech Stack

- **Frontend**: Vue.js 3 + Vite + Tailwind CSS → Vercel
- **Backend**: Node.js + Express + Sequelize → Railway
- **Database**: PostgreSQL → Supabase
- **AI**: OpenAI API
- **Email**: SendGrid
- **Scheduling**: Calendly

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
JWT_SECRET=...
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend.railway.app
VITE_CALENDLY_URL=https://calendly.com/...
```

## Deployment

See `DEPLOYMENT.md` for complete deployment instructions.

Quick overview:
1. Push to GitHub
2. Deploy backend to Railway
3. Deploy frontend to Vercel
4. Configure environment variables

## Team Setup

Add collaborators in GitHub Settings > Manage Access