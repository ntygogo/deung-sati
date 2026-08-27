import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  aiProvider: process.env.AI_PROVIDER || 'google',
  aiModel: process.env.AI_MODEL || 'gemini-3.6-flash',
  safetyModel: process.env.SAFETY_MODEL || 'gemini-3.6-flash',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  port: parseInt(process.env.PORT || '5173', 10),
};
