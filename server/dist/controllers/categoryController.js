"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = void 0;
const categoryService_1 = require("../services/categoryService");
const getCategories = async (req, res) => {
    try {
        const categories = await (0, categoryService_1.getAllCategoryNames)();
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
