import express from 'express';
import {
  getGameState,
  getCompaniesList,
  getCompanyDetail,
  getLeaderboardData,
  getNewsFeed,
  getUserPortfolioDetail,
  getUserTransactionsList,
  getAllTransactionsList,
} from '../controllers/gameController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public / Trader endpoints
router.get('/game-state', getGameState);
router.get('/companies', getCompaniesList);
router.get('/companies/:id', getCompanyDetail);
router.get('/leaderboard', getLeaderboardData);
router.get('/news', getNewsFeed);
router.get('/transactions/all', getAllTransactionsList);

// Protected User specific endpoints
router.get('/portfolio', requireAuth, getUserPortfolioDetail);
router.get('/transactions/me', requireAuth, getUserTransactionsList);

export default router;
