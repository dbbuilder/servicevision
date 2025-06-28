# ServiceVision Deployment Guide

This guide covers the deployment process for both the frontend (Vue.js) and backend (Node.js/Express) applications.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git
- Accounts on deployment platforms (Vercel for frontend, Railway for backend)

## Environment Variables

### Backend Environment Variables
```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=servicevision
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRY=7d

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@servicevision.com
FROM_NAME=ServiceVision

# Calendly Configuration
CALENDLY_WEBHOOK_SECRET=your-calendly-webhook-secret
CALENDLY_PERSONAL_ACCESS_TOKEN=your-calendly-token

# Redis Configuration (Optional)
REDIS_URL=redis://your-redis-url

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
```

### Frontend Environment Variables
```bash
# API Configuration
VITE_API_URL=https://your-backend-url.railway.app
VITE_WEBSOCKET_URL=wss://your-backend-url.railway.app
VITE_CALENDLY_URL=https://calendly.com/your-calendar
```

## Frontend Deployment (Vercel)

### 1. Initial Setup

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Navigate to frontend directory:
```bash
cd frontend
```

3. Initialize Vercel project:
```bash
vercel
```

### 2. Configuration

The `vercel.json` file is already configured with:
- Vue.js framework settings
- SPA routing rewrites
- Security headers
- Environment variable placeholders

### 3. Deploy

#### Development Deployment
```bash
vercel
```

#### Production Deployment
```bash
vercel --prod
```

### 4. Environment Variables

Set environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add the required variables:
   - `VITE_API_URL`
   - `VITE_WEBSOCKET_URL`
   - `VITE_CALENDLY_URL`

## Backend Deployment (Railway)

### 1. Initial Setup

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Navigate to backend directory:
```bash
cd backend
```

3. Initialize Railway project:
```bash
railway login
railway init
```

### 2. Database Setup

1. Add PostgreSQL database:
```bash
railway add
```
Select PostgreSQL from the list.

2. Get database connection URL:
```bash
railway variables
```

### 3. Configuration

The `railway.json` file is already configured with:
- Node.js build settings
- Health check endpoint
- Restart policies
- Environment defaults

### 4. Deploy

```bash
railway up
```

### 5. Environment Variables

Set environment variables in Railway dashboard or CLI:

```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="your-secure-secret"
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set SENDGRID_API_KEY="your-sendgrid-key"
# ... set all other required variables
```

## Post-Deployment Steps

### 1. Database Migrations

Run migrations on the production database:

```bash
railway run npm run migrate
```

### 2. Seed Initial Data (Optional)

```bash
railway run npm run seed
```

### 3. Health Checks

Verify deployments:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.railway.app/health`

### 4. Configure Webhooks

Update Calendly webhook URL to point to your production backend:
```
https://your-backend.railway.app/api/webhooks/calendly
```

### 5. DNS Configuration (Optional)

If using custom domains:

#### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

#### Railway
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Monitoring & Maintenance

### 1. Logs

#### Vercel Logs
```bash
vercel logs
```

#### Railway Logs
```bash
railway logs
```

### 2. Monitoring Setup

1. Configure error tracking (Sentry):
   - Add `SENTRY_DSN` to environment variables
   - Errors will be automatically reported

2. Set up uptime monitoring:
   - Use services like UptimeRobot or Pingdom
   - Monitor both frontend and backend URLs

### 3. Backup Strategy

1. Database backups:
   - Railway provides automatic daily backups
   - Configure additional backup strategy as needed

2. Code backups:
   - Ensure all code is committed to Git
   - Use GitHub/GitLab for version control

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure `VITE_WEBSOCKET_URL` uses `wss://` protocol
   - Check CORS configuration in backend

2. **Database Connection Error**
   - Verify database credentials
   - Check if database is accessible from Railway

3. **Build Failures**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json

4. **Email Sending Issues**
   - Verify SendGrid API key
   - Check sender domain verification

### Debug Commands

```bash
# Check backend health
curl https://your-backend.railway.app/health

# Test WebSocket connection
wscat -c wss://your-backend.railway.app

# Check environment variables
railway variables
```

## CI/CD Pipeline (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-args: '--prod'
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - uses: berviantoleo/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service_path: ./backend
```

## Security Checklist

- [ ] All sensitive data in environment variables
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (via Sequelize)
- [ ] XSS protection headers set
- [ ] JWT secrets are strong and unique
- [ ] Regular dependency updates

## Performance Optimization

1. **Frontend**
   - Enable Vercel Edge Network
   - Implement lazy loading
   - Optimize images and assets

2. **Backend**
   - Enable Railway autoscaling
   - Implement Redis caching
   - Optimize database queries

## Rollback Procedures

### Vercel Rollback
```bash
vercel ls
vercel rollback [deployment-url]
```

### Railway Rollback
Use Railway dashboard to revert to previous deployment.

## Support

For deployment issues:
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Project Issues: https://github.com/yourusername/servicevision/issues