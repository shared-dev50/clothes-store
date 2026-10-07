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
          const updateResult = await tx.order.updateMany({
            where: { 
              id: order.id, 
              status: 'PENDING_PAYMENT',
              expiresAt: { lt: new Date() }
            },
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
            console.log(`Expired order ${order.orderNumber} and released stock reservations.`);
          }
        });
      }
    } catch (error) {
      console.error('Error in order expiry job:', error);
    }
  }, 60 * 1000);
};
