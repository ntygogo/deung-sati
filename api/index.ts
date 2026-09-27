// Express must receive the original stream so Stripe can verify its signature.
export const config = { api: { bodyParser: false } };
import express from 'express';
import { apiApp } from '../server/apiRouter.js';

// Vercel forwards the original /api/... URL; local Vite already mounts /api.
const app = express();
app.use('/api', apiApp);
export default app;
