import { Request, Response } from 'express';
import * as productService from '../services/productService';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, featured, newArrival, search } = req.query;
    
    const products = await productService.getProducts({
      category: category as string,
      featured: featured as string,
      newArrival: newArrival as string,
      search: search as string,
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const product = await productService.getProductBySlug(slug as string);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};
