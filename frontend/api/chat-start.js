// Example Vercel Function for chat endpoint
// Place in frontend/api/chat/start.js for serverless deployment

const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a friendly and professional AI consultant for ServiceVision...`;

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, organizationName } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // In serverless, you'd use a service like Upstash Redis or Vercel KV for session storage
        const sessionId = crypto.randomUUID();
        
        // Generate initial message
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { 
                role: 'user', 
                content: `A visitor just started a chat. Their email is ${email}${organizationName ? ` and they work at ${organizationName}` : ''}. Start with a warm greeting.`
            }
        ];

        const response = await openai.chat.completions.create({
            messages,
            model: 'gpt-4-turbo-preview',
            temperature: 0.7,
            max_tokens: 200
        });

        const message = response.choices[0].message.content;

        // Store session data in Vercel KV or similar
        // await kv.set(`session:${sessionId}`, { email, organizationName, messages });

        return res.status(200).json({
            sessionId,
            message,
            leadId: sessionId, // In production, create proper lead ID
            isNewLead: true
        });
    } catch (error) {
        console.error('Chat error:', error);
        return res.status(500).json({ 
            error: 'Failed to start chat session' 
        });
    }
}