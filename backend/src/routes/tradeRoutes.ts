import express from 'express';
import { executeTrade } from '../controllers/tradeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/execute', requireAuth, executeTrade);

export default router;
