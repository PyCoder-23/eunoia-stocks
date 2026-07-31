"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_js_1 = require("../controllers/adminController.js");
const gameController_js_1 = require("../controllers/gameController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
router.use(auth_js_1.requireAuth, auth_js_1.requireAdmin);
// Game state & round controls (Manual per IMP NOTE)
router.post('/game-state', adminController_js_1.updateGameState);
router.post('/reset', adminController_js_1.resetCompetition);
// Company management
router.post('/companies', adminController_js_1.createCompany);
router.put('/companies/:id', adminController_js_1.updateCompany);
router.delete('/companies/:id', adminController_js_1.deleteCompany);
// Player management
router.post('/users', adminController_js_1.createTraderAccount);
router.get('/users', adminController_js_1.getAllUsers);
router.put('/users/:id/password', adminController_js_1.resetUserPassword);
router.get('/users/:userId/portfolio', gameController_js_1.getUserPortfolioDetail);
// News & Chaos
router.post('/news/ai', adminController_js_1.dispatchAINews);
router.post('/news/manual', adminController_js_1.dispatchManualNews);
router.post('/chaos', adminController_js_1.dispatchChaosEvent);
// Monitoring & Analytics
router.get('/analytics', adminController_js_1.getAnalytics);
router.get('/transactions', gameController_js_1.getAllTransactionsList);
exports.default = router;
