import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Statistiques du dashboard
export async function GET() {
  try {
    // Chiffre d'affaires
    const totalRevenue = await prisma.payment.aggregate({ _sum: { amount: true } });
    // Nombre de clients
    const clientCount = await prisma.client.count();
    // Nombre de réservations
    const appointmentCount = await prisma.appointment.count();
    // Nombre de reviews
    const reviewCount = await prisma.review.count();
    // Nombre de promos utilisées
    const promoCount = await prisma.promoCode.count();

    return NextResponse.json({
      ok: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        clientCount,
        appointmentCount,
        reviewCount,
        promoCount,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
