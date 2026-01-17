import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = "AIzaSyBu4pVGDfWWrl7SDNmKVpHbOjkC0g2tzf0";

if (!apiKey) {
    console.warn(
        '⚠️  WARNING: GEMINI_API_KEY is not set in environment variables.\n' +
        '   AI features will fail. Please set GEMINI_API_KEY in your .env.local file.\n' +
        '   Get your API key from: https://aistudio.google.com/app/apikey'
    );
}

export const genAI = new GoogleGenerativeAI(apiKey || '');
