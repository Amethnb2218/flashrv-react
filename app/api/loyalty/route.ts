export async function POST(request) {
  try {
    const body = await request.json();
    const loyalty = await prisma.loyalty.create({ data: body });
    return NextResponse.json({ ok: true, data: loyalty });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const loyalty = await prisma.loyalty.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: loyalty });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.loyalty.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
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
