"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCategoryNames = void 0;
const db_1 = __importDefault(require("../config/db"));
const getAllCategoryNames = async () => {
    const rootCategories = await db_1.default.category.findMany({
        where: { parentId: null },
        include: {
            children: {
                orderBy: { name: 'asc' },
            },
        },
        orderBy: { name: 'asc' },
    });
    const names = [];
    for (const root of rootCategories) {
        names.push(root.name);
        for (const child of root.children) {
            names.push(child.name);
        }
    }
    return names;
};
exports.getAllCategoryNames = getAllCategoryNames;
