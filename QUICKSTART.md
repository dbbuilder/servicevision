# ServiceVision Quick Start Guide

## Prerequisites
- Node.js 18+ and npm
- Supabase account (PostgreSQL database)
- OpenAI API key
- SendGrid account
- Calendly account

## Installation Steps

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` in the backend directory and fill in your values:
```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

### 4. Set up Database
1. Create a Supabase project at https://supabase.com
2. Copy the connection string from Settings > Database
3. Add to your .env file:
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

Then run migrations:
```bash
cd backend
npm run migrate
```

### 5. Start Development Servers

#### Backend (Terminal 1):
```bash
cd backend
npm run dev
```
The backend will run on http://localhost:3000

#### Frontend (Terminal 2):
```bash
cd frontend
npm run dev
```
The frontend will run on http://localhost:5173

## Key Features to Test

1. **AI Chat Widget**: Click the chat button in the bottom right
2. **Email Collection**: Start a chat session with your email
3. **Service Information**: Browse the services section
4. **Responsive Design**: Test on different screen sizes

## Troubleshooting

### Database Connection Issues
- Ensure SQL Server is running
- Check connection string in .env
- Verify firewall settings

### AI Chat Not Working
- Verify OpenAI API key starts with 'sk-'
- Check you have API credits available
- Ensure model name is correct (gpt-4-turbo-preview)
- Review OpenAI usage dashboard

### Email Not Sending
- Verify SendGrid API key
- Check sender email is verified
- Review SendGrid logs

## Next Steps

1. Customize the AI prompts in `backend/src/services/chatService.js`
2. Update company information and branding
3. Configure Calendly integration
4. Set up production deployment
5. Add Google Analytics and monitoring

## Support

For questions or issues, contact: info@servicevision.net