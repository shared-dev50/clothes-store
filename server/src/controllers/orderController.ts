import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, customerName, customerEmail, customerPhone, deliveryAddress, county, deliveryNotes } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item' });
      return;
    }

    let subtotal = 0;
    const orderItemsData: any[] = [];

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const { productId, variantId, quantity } = item;
        
        if (!quantity || quantity <= 0) {
          throw new Error('Invalid quantity');
        }
        
        let dbVariant;
        
        if (variantId) {
          dbVariant = await tx.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
          if (!dbVariant) {
            throw new Error(`Variant not found`);
          }
          if (dbVariant.stock - dbVariant.reservedStock < quantity) {
             throw new Error(`Insufficient stock for ${dbVariant.product.name}`);
          }
          
          // Atomically reserve stock and check if it went below 0
          const updatedVariant = await tx.productVariant.update({
            where: { id: dbVariant.id },
            data: { reservedStock: { increment: quantity } }
          });

          if (updatedVariant.stock - updatedVariant.reservedStock < 0) {
            throw new Error(`Insufficient stock for ${dbVariant.product.name} due to concurrent order`);
          }
          
          const unitPrice = dbVariant.price ?? dbVariant.product.price;
          const totalPrice = Number(unitPrice) * quantity;
          subtotal += totalPrice;
          
          orderItemsData.push({
            productId: dbVariant.product.id,
            variantId: dbVariant.id,
            productName: dbVariant.product.name,
            variantInfo: [dbVariant.color, dbVariant.size].filter(Boolean).join(' / '),
            quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice
          });
        } else {
           throw new Error('Variant ID is required for checkout');
        }
      }

      const deliveryFee = 0; // Temporarily removed: subtotal > 10000 ? 0 : 300;
      const total = subtotal + deliveryFee;

      const orderNumber = `NAI-${Math.floor(10000 + Math.random() * 90000)}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user?.userId || null,
          customerName,
          customerEmail,
          customerPhone,
          deliveryAddress: deliveryAddress || 'N/A',
          county: county || 'N/A',
          deliveryNotes: deliveryNotes || '',
          subtotal,
          deliveryFee,
          total,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'UNPAID',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true
        }
      });

      return order;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(400).json({ error: error.message || 'Failed to create order' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Security Check: If order belongs to a user, only that user or an ADMIN can view it.
    // If order is a guest order (userId is null), anyone with the orderNumber can view it (acting as a secret key).
    if (order.userId) {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: Please log in to view this order.' });
        return;
      }
      if (req.user.userId !== order.userId && req.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden: You do not have permission to view this order.' });
        return;
      }
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const getAdminOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: { select: { email: true } }
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getAdminOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { email: true } }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['PENDING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
