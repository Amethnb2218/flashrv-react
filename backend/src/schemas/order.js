const { z } = require('zod');

const createOrderSchema = z.object({
  body: z.object({
    salonId: z.string().min(1, 'salonId requis'),
    items: z.array(z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(99).or(z.string().regex(/^\d+$/).transform(Number)),
    })).min(1, 'Au moins un article requis'),
    notes: z.string().max(500).optional(),
    deliveryMode: z.enum(['PICKUP', 'DELIVERY']).optional(),
    deliveryAddress: z.string().max(300).optional(),
    clientPhone: z.string().max(20).optional(),
    clientName: z.string().max(60).optional(),
    paymentMethod: z.string().optional(),
    checkoutAmount: z.number().optional(),
  }),
});

module.exports = { createOrderSchema };
