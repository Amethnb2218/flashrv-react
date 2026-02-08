import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const services = await prisma.service.findMany({});
    return NextResponse.json({ ok: true, data: services });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
