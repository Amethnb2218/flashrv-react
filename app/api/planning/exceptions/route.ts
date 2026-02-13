export async function POST(request) {
  try {
    const body = await request.json();
    const exception = await prisma.planningException.create({ data: body });
    return NextResponse.json({ ok: true, data: exception });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const exception = await prisma.planningException.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: exception });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.planningException.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
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
