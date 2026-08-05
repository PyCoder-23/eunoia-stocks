import express from 'express';
import { executeTrade, createOrder, cancelOrder, getPendingOrders } from '../controllers/tradeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/execute', requireAuth, executeTrade);
router.post('/orders', requireAuth, createOrder);
router.get('/orders', requireAuth, getPendingOrders);
router.delete('/orders/:orderId', requireAuth, cancelOrder);

export default router;
