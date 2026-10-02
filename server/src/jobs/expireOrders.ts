import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startOrderExpiryJob = () => {
  // Run every 1 minute
  setInterval(async () => {
    try {
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING_PAYMENT',
          expiresAt: {
            lt: new Date()
          }
        },
        include: { items: true }
      });

      for (const order of expiredOrders) {
        await prisma.$transaction(async (tx) => {
          // Double check inside transaction
          const currentOrder = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true, expiresAt: true }
          });
          
          if (currentOrder && currentOrder.status === 'PENDING_PAYMENT' && currentOrder.expiresAt && currentOrder.expiresAt < new Date()) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: 'CANCELLED' }
            });

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
        console.log(`Expired order ${order.orderNumber} and released stock reservations.`);
      }
    } catch (error) {
      console.error('Error in order expiry job:', error);
    }
  }, 60 * 1000);
};
