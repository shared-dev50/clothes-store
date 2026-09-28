import { Request, Response } from 'express';
import { getAllCategoryNames } from '../services/categoryService';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await getAllCategoryNames();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};
