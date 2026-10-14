import { Request, Response } from 'express';
import * as homepageService from '../services/homepageService';

export const getHomepageSettings = async (req: Request, res: Response) => {
  try {
    const settings = await homepageService.getHomepageSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching homepage settings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch homepage settings' });
  }
};

export const updateHomepageSettings = async (req: Request, res: Response) => {
  try {
    const updated = await homepageService.updateHomepageSettings(req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating homepage settings:', error);
    res.status(400).json({ error: error.message || 'Failed to update homepage settings' });
  }
};
