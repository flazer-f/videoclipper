import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
    // Warn or throw, but for now just warn to avoid build crashes if env not set
    console.warn('OPENAI_API_KEY is not set. AI features will fail.');
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy',
});
