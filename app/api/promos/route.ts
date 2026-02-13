export async function POST(request) {
  try {
    const body = await request.json();
    const promo = await prisma.promoCode.create({ data: body });
    return NextResponse.json({ ok: true, data: promo });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const promo = await prisma.promoCode.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: promo });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.promoCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const promos = await prisma.promoCode.findMany({});
    return NextResponse.json({ ok: true, data: promos });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
