import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { generateGuestOrderToken } from '../utils/authUtils';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, customerName, customerEmail, customerPhone, deliveryAddress, county, deliveryNotes, replaceOrderNumber } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item' });
      return;
    }

    let subtotal = 0;
    const orderItemsData: any[] = [];

    const result = await prisma.$transaction(async (tx) => {
      // If replacing a previous pending order, cancel it and release its reservations atomically
      if (replaceOrderNumber) {
        const oldOrder = await tx.order.findUnique({
          where: { orderNumber: replaceOrderNumber },
          include: { items: true }
        });
        if (oldOrder && oldOrder.status === 'PENDING_PAYMENT' && oldOrder.paymentStatus === 'UNPAID') {
          if (!oldOrder.userId || (req.user && (req.user.userId === oldOrder.userId || req.user.role === 'ADMIN'))) {
            const cancelRes = await tx.order.updateMany({
              where: { id: oldOrder.id, status: 'PENDING_PAYMENT' },
              data: { status: 'CANCELLED' }
            });
            if (cancelRes.count === 1) {
              for (const oldItem of oldOrder.items) {
                if (oldItem.variantId) {
                  await tx.productVariant.update({
                    where: { id: oldItem.variantId },
                    data: { reservedStock: { decrement: oldItem.quantity } }
                  });
                }
              }
            }
          }
        }
      }

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
          if (dbVariant.isArchived) {
             throw new Error(`Variant for ${dbVariant.product.name} is no longer available`);
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

    // For guest checkout: Issue order-specific guest token and set HttpOnly cookie
    if (!result.userId) {
      const guestAccessToken = generateGuestOrderToken(result.orderNumber);
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie(`hbs_guest_${result.orderNumber}`, guestAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
      res.status(201).json({ ...result, guestAccessToken });
      return;
    }

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

    // 1. Admin access: full access
    if (req.user?.role === 'ADMIN') {
      res.json(order);
      return;
    }

    // 2. Registered customer order: must belong to the logged-in customer
    if (order.userId) {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: Please log in to view this order.' });
        return;
      }
      if (req.user.userId !== order.userId) {
        res.status(403).json({ error: 'Forbidden: You do not have permission to view this order.' });
        return;
      }
      res.json(order);
      return;
    }

    // 3. Guest order: verify order-specific guest token or verified customer email
    const rawGuestToken =
      (req.headers['x-guest-token'] as string) ||
      (req.query.token as string) ||
      req.cookies?.[`hbs_guest_${order.orderNumber}`] ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined);

    let isAuthorizedGuest = false;

    if (rawGuestToken) {
      try {
        const decoded = jwt.verify(rawGuestToken, JWT_SECRET) as any;
        if (decoded && decoded.orderNumber === order.orderNumber) {
          isAuthorizedGuest = true;
        }
      } catch {
        // Invalid or expired guest token
      }
    }

    // Fallback: Matching customer email provided via query param or header (for customer receipt/email links)
    const verificationEmail = (req.query.email as string) || (req.headers['x-guest-email'] as string);
    if (verificationEmail && verificationEmail.trim().toLowerCase() === order.customerEmail.toLowerCase()) {
      isAuthorizedGuest = true;
    }

    if (isAuthorizedGuest) {
      res.json(order);
      return;
    }

    // Unauthorized guest order lookup: Deny access to prevent order number scraping and personal data disclosure
    res.status(403).json({
      error: 'Access denied: Valid order access token or matching customer email is required to view order details.',
      requiresVerification: true,
      orderNumber: order.orderNumber,
    });
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

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (order.userId) {
      if (order.userId !== req.user?.userId && req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    } else {
      // Guest cancellation verification: require guest access token, cookie, or matching email
      const rawGuestToken =
        (req.headers['x-guest-token'] as string) ||
        (req.query.token as string) ||
        req.cookies?.[`hbs_guest_${order.orderNumber}`] ||
        (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined);

      let isAuthorizedGuest = false;

      if (rawGuestToken) {
        try {
          const decoded = jwt.verify(rawGuestToken, JWT_SECRET) as any;
          if (decoded && decoded.orderNumber === order.orderNumber) {
            isAuthorizedGuest = true;
          }
        } catch {}
      }

      const verificationEmail = (req.query.email as string) || (req.headers['x-guest-email'] as string);
      if (verificationEmail && verificationEmail.trim().toLowerCase() === order.customerEmail.toLowerCase()) {
        isAuthorizedGuest = true;
      }

      if (!isAuthorizedGuest && req.user?.role !== 'ADMIN') {
        res.status(403).json({
          error: 'Forbidden: Valid order access token or matching customer email is required to cancel this order.'
        });
        return;
      }
    }

    if (order.status === 'CANCELLED') {
      res.json({ message: 'Order is already cancelled', order });
      return;
    }

    if (order.paymentStatus === 'PAID' || order.status === 'PROCESSING') {
      res.status(400).json({ error: 'Cannot cancel an order that has already been paid' });
      return;
    }

    // Atomically transition from PENDING_PAYMENT to CANCELLED and release reserved stock
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING_PAYMENT' },
        data: { status: 'CANCELLED' }
      });

      if (updateResult.count === 1) {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { reservedStock: { decrement: item.quantity } }
            });
          }
        }
      }
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true }
    });

    res.json({ message: 'Order cancelled and reservations released', order: updated });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel order' });
  }
};

