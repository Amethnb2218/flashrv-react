import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const portfolio = await prisma.galleryImage.findMany({});
    return NextResponse.json({ ok: true, data: portfolio });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
