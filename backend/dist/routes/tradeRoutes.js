"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tradeController_js_1 = require("../controllers/tradeController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
router.post('/execute', auth_js_1.requireAuth, tradeController_js_1.executeTrade);
exports.default = router;
