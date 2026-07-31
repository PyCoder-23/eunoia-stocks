"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gameController_js_1 = require("../controllers/gameController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
// Public / Trader endpoints
router.get('/game-state', gameController_js_1.getGameState);
router.get('/companies', gameController_js_1.getCompaniesList);
router.get('/companies/:id', gameController_js_1.getCompanyDetail);
router.get('/leaderboard', gameController_js_1.getLeaderboardData);
router.get('/news', gameController_js_1.getNewsFeed);
router.get('/transactions/all', gameController_js_1.getAllTransactionsList);
// Protected User specific endpoints
router.get('/portfolio', auth_js_1.requireAuth, gameController_js_1.getUserPortfolioDetail);
router.get('/transactions/me', auth_js_1.requireAuth, gameController_js_1.getUserTransactionsList);
exports.default = router;
