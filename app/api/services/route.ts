import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/backend/src/utils/jwt';

export async function GET(req) {
  // Récupère le token JWT depuis l’en-tête Authorization
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ ok: false, error: 'Token manquant' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  let user;
  try {
    user = verifyToken(token); // Décodage JWT, doit contenir userId
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Token invalide' }, { status: 401 });
  }

  // Récupère le salon du user connecté
  const salon = await prisma.salon.findUnique({ where: { ownerId: user.userId } });
  if (!salon) return NextResponse.json({ ok: true, data: [] });

  const where = {
    salonId: salon.id,
    isActive: true,
    deletedAt: null,
  };

  try {
    const services = await prisma.service.findMany({ where });
    return NextResponse.json({ ok: true, data: services });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
