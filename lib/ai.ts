import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = "AIzaSyA3AK4iU8QEeF22gc1uL74w9pX8xxvrwFg";

if (!apiKey) {
    console.warn(
        '⚠️  WARNING: GEMINI_API_KEY is not set in environment variables.\n' +
        '   AI features will fail. Please set GEMINI_API_KEY in your .env.local file.\n' +
        '   Get your API key from: https://aistudio.google.com/app/apikey'
    );
}

export const genAI = new GoogleGenerativeAI(apiKey || '');
