import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getCloudinarySignature = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.CLOUDINARY_API_SECRET) {
      res.status(500).json({ error: 'Cloudinary configuration is missing' });
      return;
    }

    let paramsToSign = req.body;
    
    // If no params provided or it's empty, use default timestamp
    if (!paramsToSign || Object.keys(paramsToSign).length === 0) {
      paramsToSign = {
        timestamp: Math.round(new Date().getTime() / 1000)
      };
    }
    
    // Always enforce our folder if not provided
    if (!paramsToSign.folder) {
      paramsToSign.folder = process.env.CLOUDINARY_FOLDER || 'clothing-store/products';
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp: paramsToSign.timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: paramsToSign.folder,
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
};
