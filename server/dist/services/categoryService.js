"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCategoryNames = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAllCategoryNames = async () => {
    const categories = await db_1.default.category.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
    });
    return ['All', ...categories.map(c => c.name)];
};
exports.getAllCategoryNames = getAllCategoryNames;
