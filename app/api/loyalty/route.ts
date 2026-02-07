import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const loyalty = await prisma.loyalty.findMany({
      include: {
        client: true,
      },
    });
    return NextResponse.json({ ok: true, data: loyalty });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
