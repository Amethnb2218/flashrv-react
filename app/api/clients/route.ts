import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.user.findMany({ where: { role: 'CLIENT' } });
    return NextResponse.json({ ok: true, data: clients });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
