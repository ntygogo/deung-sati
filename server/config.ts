import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

export const config = {
  get aiProvider() {
    return process.env.AI_PROVIDER || 'google';
  },
  get aiModel() {
    return process.env.AI_MODEL || 'gemini-3.5-flash';
  },
  get safetyModel() {
    return process.env.SAFETY_MODEL || 'gemini-3.5-flash';
  },
  get geminiApiKey() {
    return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  },
  port: parseInt(process.env.PORT || '5173', 10),
};
