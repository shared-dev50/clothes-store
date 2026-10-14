import { Request, Response } from 'express';
import prisma from '../config/db';

export const getHealth = async (_req: Request, res: Response) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    service: 'hbs-wear-api',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
};
