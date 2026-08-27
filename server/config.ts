import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  aiProvider: process.env.AI_PROVIDER || 'google',
  aiModel: process.env.AI_MODEL || 'gemini-2.0-flash',
  safetyModel: process.env.SAFETY_MODEL || 'gemini-2.0-flash',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AQ.Ab8RN6Ild9cy-LknDA5Lw1syfrf2Zsfml3815_QABJ4w3Fsf6g',
  port: parseInt(process.env.PORT || '5173', 10),
};
