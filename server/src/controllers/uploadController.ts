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

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = process.env.CLOUDINARY_FOLDER || 'hbs-wear/products';
    
    // We can also allow the client to specify a subfolder or id, but folder is sufficient
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
};
