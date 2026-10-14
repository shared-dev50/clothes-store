"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = void 0;
const db_1 = __importDefault(require("../config/db"));
const getHealth = async (_req, res) => {
    let dbStatus = 'connected';
    try {
        await db_1.default.$queryRaw `SELECT 1`;
    }
    catch {
        dbStatus = 'disconnected';
    }
    res.json({
        status: 'ok',
        service: 'hbs-wear-api',
        timestamp: new Date().toISOString(),
        database: dbStatus,
    });
};
exports.getHealth = getHealth;
