import express from 'express';
import { apiApp } from '../server/apiRouter.js';

// Vercel forwards the original /api/... URL; local Vite already mounts /api.
const app = express();
app.use('/api', apiApp);
export default app;
