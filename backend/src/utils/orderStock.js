const prisma = require('../lib/prisma');

const STOCK_COMMITTED_STATUSES = new Set(['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED']);

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isStockCommittedStatus = (status) => STOCK_COMMITTED_STATUSES.has(normalizeStatus(status));

const commitOrderStockIfNeeded = async (orderId) => {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: normalizedOrderId },
      include: {
        items: true,
      },
    });

    if (!order) return null;
    if (isStockCommittedStatus(order.status)) return order;

    for (const item of order.items || []) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: normalizedOrderId },
      data: { status: 'CONFIRMED' },
    });
  });
};

const restoreOrderStockIfNeeded = async (orderId) => {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: normalizedOrderId },
      include: {
        items: true,
      },
    });

    if (!order) return null;
    if (!isStockCommittedStatus(order.status)) {
      return tx.order.update({
        where: { id: normalizedOrderId },
        data: { status: 'CANCELLED' },
      });
    }

    for (const item of order.items || []) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: normalizedOrderId },
      data: { status: 'CANCELLED' },
    });
  });
};

module.exports = {
  isStockCommittedStatus,
  commitOrderStockIfNeeded,
  restoreOrderStockIfNeeded,
};
