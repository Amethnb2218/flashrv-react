import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const exceptions = await prisma.planningException.findMany({});
    return NextResponse.json({ ok: true, data: exceptions });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
