import express from 'express';
import {
  updateGameState,
  resetCompetition,
  createCompany,
  updateCompany,
  deleteCompany,
  createTraderAccount,
  getAllUsers,
  resetUserPassword,
  dispatchAINews,
  dispatchManualNews,
  dispatchChaosEvent,
  getAnalytics,
  adjustTeamCash,
} from '../controllers/adminController.js';
import { getAllTransactionsList, getUserPortfolioDetail } from '../controllers/gameController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

// Game state & round controls (Manual per IMP NOTE)
router.post('/game-state', updateGameState);
router.post('/reset', resetCompetition);

// Company management
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

// Player management
router.post('/users', createTraderAccount);
router.get('/users', getAllUsers);
router.put('/users/:id/password', resetUserPassword);
router.post('/users/:id/cash', adjustTeamCash);
router.get('/users/:userId/portfolio', getUserPortfolioDetail);

// News & Chaos
router.post('/news/ai', dispatchAINews);
router.post('/news/manual', dispatchManualNews);
router.post('/chaos', dispatchChaosEvent);

// Monitoring & Analytics
router.get('/analytics', getAnalytics);
router.get('/transactions', getAllTransactionsList);

export default router;
