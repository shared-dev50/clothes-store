import cron, { ScheduledTask } from 'node-cron';
import prisma from '../config/db';

/** Upper bound per sweep so a large backlog can't hold the event loop / DB for long. */
const BATCH_SIZE = 100;

/**
 * Cancels every PENDING_PAYMENT order whose reservation window has passed and releases
 * its reserved stock. Safe to run concurrently with payment callbacks/webhooks and with
 * other instances of this job:
 *
 *  - The order is cancelled with a conditional `updateMany` (status + expiresAt re-checked
 *    at write time). Postgres re-evaluates the WHERE clause after any concurrent writer
 *    commits, so if a payment callback moves the order to PROCESSING first, count === 0
 *    and we skip it. If we win, the callback later sees a CANCELLED order and records the
 *    payment for manual review without touching stock.
 *  - Stock is only released inside the same transaction, and only when we were the ones
 *    who cancelled the order, so a reservation is never released twice.
 *
 * @returns the number of orders cancelled in this sweep.
 */
export const releaseExpiredOrders = async (now: Date = new Date()): Promise<number> => {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      expiresAt: { lt: now }
    },
    include: { items: true },
    orderBy: { expiresAt: 'asc' },
    take: BATCH_SIZE
  });

  let cancelledCount = 0;

  for (const order of expiredOrders) {
    try {
      const cancelled = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.order.updateMany({
          where: {
            id: order.id,
            status: 'PENDING_PAYMENT',
            expiresAt: { lt: new Date() }
          },
          data: { status: 'CANCELLED' }
        });

        if (updateResult.count !== 1) {
          return false; // Paid, cancelled, or extended by someone else in the meantime
        }

        // Aggregate per variant in case an order has multiple lines for the same variant.
        const quantitiesByVariant = new Map<string, number>();
        for (const item of order.items) {
          if (item.variantId) {
            quantitiesByVariant.set(item.variantId, (quantitiesByVariant.get(item.variantId) ?? 0) + item.quantity);
          }
        }

        for (const [variantId, quantity] of quantitiesByVariant) {
          // Conditional decrement so reservedStock can never go negative.
          const released = await tx.productVariant.updateMany({
            where: { id: variantId, reservedStock: { gte: quantity } },
            data: { reservedStock: { decrement: quantity } }
          });

          if (released.count === 0) {
            // Reservation accounting already drifted; clamp to zero rather than going negative.
            console.warn(
              `[releaseExpiredOrders] Variant ${variantId} had less than ${quantity} reserved while ` +
              `expiring order ${order.orderNumber}. Clamping reservedStock to 0.`
            );
            await tx.productVariant.update({
              where: { id: variantId },
              data: { reservedStock: 0 }
            });
          }
        }

        return true;
      });

      if (cancelled) {
        cancelledCount++;
        console.log(`[releaseExpiredOrders] Expired order ${order.orderNumber} and released stock reservations.`);
      }
    } catch (error) {
      // One bad order must not block the rest of the batch.
      console.error(`[releaseExpiredOrders] Failed to expire order ${order.orderNumber}:`, error);
    }
  }

  return cancelledCount;
};

/**
 * Schedules {@link releaseExpiredOrders} every minute. `noOverlap` skips a tick if the
 * previous sweep is still running, so slow DB periods can't pile up concurrent sweeps.
 */
export const startReleaseExpiredOrdersJob = (): ScheduledTask => {
  return cron.schedule(
    '* * * * *',
    async () => {
      try {
        await releaseExpiredOrders();
      } catch (error) {
        console.error('[releaseExpiredOrders] Sweep failed:', error);
      }
    },
    { name: 'release-expired-orders', noOverlap: true }
  );
};
