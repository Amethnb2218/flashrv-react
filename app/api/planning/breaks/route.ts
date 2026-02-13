export async function POST(request) {
  try {
    const body = await request.json();
    const breakItem = await prisma.planningBreak.create({ data: body });
    return NextResponse.json({ ok: true, data: breakItem });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const breakItem = await prisma.planningBreak.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: breakItem });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.planningBreak.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const breaks = await prisma.planningBreak.findMany({});
    return NextResponse.json({ ok: true, data: breaks });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
