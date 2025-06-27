# ServiceVision Deployment Guide

## Technology Stack

Our chosen deployment stack:
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: Supabase (PostgreSQL)
- **Sessions**: In-memory (can upgrade to Upstash Redis)

## Prerequisites

1. Create accounts at:
   - [Vercel](https://vercel.com)
   - [Railway](https://railway.app)
   - [Supabase](https://supabase.com)
   - [OpenAI](https://platform.openai.com)
   - [SendGrid](https://sendgrid.com)

2. Install CLI tools:
   ```bash
   npm i -g vercel
   npm i -g @railway/cli
   ```

## Step 1: Set Up Supabase Database

1. **Create New Project** at [supabase.com](https://supabase.com)
2. **Copy Connection String** from Settings > Database
3. **Note the connection details**:
   - Host: `db.[YOUR-PROJECT-REF].supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (your database password)

## Step 2: Deploy Backend to Railway

1. **Push code to GitHub** (see Git Setup section below)

2. **Create Railway Project**:
   ```bash
   cd backend
   railway login
   railway init
   ```

3. **Link GitHub Repo**:
   - Go to Railway dashboard
   - Click "New Project" > "Deploy from GitHub repo"
   - Select your repository and the `/backend` directory
4. **Add Environment Variables** in Railway dashboard:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   OPENAI_API_KEY=sk-...
   SENDGRID_API_KEY=SG...
   JWT_SECRET=generate-a-long-random-string
   CORS_ORIGIN=https://your-app.vercel.app
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

6. **Get your Railway URL** from the dashboard (e.g., `https://servicevision-backend.up.railway.app`)

## Step 3: Deploy Frontend to Vercel

1. **Update API URL**:
   ```bash
   cd frontend
   echo "VITE_API_URL=https://servicevision-backend.up.railway.app" > .env.production
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel dashboard:
   - `VITE_API_URL`: Your Railway backend URL
   - `VITE_CALENDLY_URL`: Your Calendly link

4. **Configure Domain** (optional):
   - Add custom domain in Vercel settings
   - Update DNS records

## Step 4: Database Migration

1. **Connect to Railway**:
   ```bash
   railway run npm run migrate
   ```

2. **Seed initial data** (optional):
   ```bash
   railway run npm run seed
   ```
## Step 5: Final Configuration

1. **Update CORS in Railway**:
   - Set `CORS_ORIGIN` to your Vercel URL
   - Redeploy backend: `railway up`

2. **Test the Integration**:
   - Visit your Vercel URL
   - Click the chat widget
   - Verify AI responses work
   - Test email sending

3. **Configure Webhooks**:
   - Add Calendly webhook URL: `https://your-backend.railway.app/api/webhooks/calendly`
   - Add SendGrid webhook URL: `https://your-backend.railway.app/api/webhooks/sendgrid`

## Git Setup

```bash
# Initialize repository
cd d:\dev2\servicevisionsite
git init

# Create .gitignore
cat > .gitignore << EOL
# Dependencies
node_modules/
.pnp
.pnp.js

# Production
/build
/dist

# Environment files
.env
.env.local
.env.production
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Database
*.sqlite
*.sqlite3

# Temporary files
tmp/
temp/
EOL

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: ServiceVision consulting platform with AI chat"

# Create GitHub repository (do this on GitHub.com)
# Then add remote
git remote add origin https://github.com/YOUR-USERNAME/servicevision.git
git branch -M main
git push -u origin main
```
## Monitoring & Maintenance

### Monitoring Setup

1. **Railway Metrics**:
   - CPU and Memory usage
   - Request logs
   - Deployment history

2. **Vercel Analytics**:
   - Page views
   - Web Vitals
   - User geography

3. **Supabase Dashboard**:
   - Database performance
   - Query insights
   - Storage usage

4. **External Monitoring** (recommended):
   - [UptimeRobot](https://uptimerobot.com) - Free uptime monitoring
   - [Sentry](https://sentry.io) - Error tracking
   - [LogRocket](https://logrocket.com) - Session replay

### Regular Maintenance

- **Weekly**:
  - Check OpenAI API usage and costs
  - Review error logs in Railway
  - Monitor email delivery rates

- **Monthly**:
  - Update dependencies
  - Review database performance
  - Backup Supabase data
  - Analyze chat conversation patterns

## Cost Summary

### Monthly Estimates:
- **Vercel**: Free (hobby plan)
- **Railway**: $5-20 (usage-based)
- **Supabase**: Free (up to 500MB)
- **OpenAI**: $20-100 (based on usage)
- **SendGrid**: $15 (up to 40k emails)

**Total**: ~$40-135/month

### Cost Optimization Tips:
1. Use Vercel's caching for static assets
2. Implement request caching in Railway
3. Optimize database queries
4. Cache common AI responses
5. Use SendGrid templates for emails

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   ```bash
   # Check Railway env var
   CORS_ORIGIN=https://your-app.vercel.app
   ```

2. **Database Connection**:
   ```bash
   # Test connection
   railway run node -e "require('./src/models').sequelize.authenticate()"
   ```

3. **OpenAI Rate Limits**:
   - Implement exponential backoff
   - Add request queuing
   - Cache responses

4. **Deployment Failures**:
   - Check Railway build logs
   - Verify all env vars are set
   - Ensure package.json scripts are correct

## Support Resources

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Our Docs**: Check `/docs` folder in the repository