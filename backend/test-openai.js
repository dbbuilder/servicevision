// Test OpenAI Connection
// Run with: node test-openai.js

require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
    console.log('Testing OpenAI connection...\n');
    
    // Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
        return;
    }

    console.log('✅ API Key found:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        console.log('\nSending test message...');
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant. Respond with a brief greeting.'
                },
                {
                    role: 'user',
                    content: 'Hello!'
                }
            ],
            max_tokens: 50
        });

        console.log('✅ Success! Response:', response.choices[0].message.content);
        console.log('\nModel used:', response.model);
        console.log('Tokens used:', response.usage.total_tokens);
        
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        
        if (error.status === 401) {
            console.error('\nInvalid API key. Please check your OPENAI_API_KEY in .env');
        } else if (error.status === 429) {
            console.error('\nRate limit exceeded or insufficient credits');
        } else if (error.status === 404) {
            console.error('\nModel not found. Try using "gpt-3.5-turbo" instead');
        }
    }
}

testOpenAI();