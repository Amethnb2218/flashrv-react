import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Liste des moyens de paiement du salon
export async function GET(req) {
  try {
    // À adapter selon votre modèle : ici on suppose un modèle PaymentMethod lié au salon
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { salonId: 1 }, // TODO: remplacer par l'ID du salon connecté
    });
    return NextResponse.json({ ok: true, data: paymentMethods });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

// POST: Ajouter un moyen de paiement
export async function POST(req) {
  try {
    const body = await req.json();
    // TODO: sécuriser et valider les champs
    const created = await prisma.paymentMethod.create({
      data: {
        method: body.method,
        enabled: body.enabled,
        salonId: 1, // TODO: remplacer par l'ID du salon connecté
      },
    });
    return NextResponse.json({ ok: true, data: created });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
