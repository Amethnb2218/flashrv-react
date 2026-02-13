export async function POST(request) {
  try {
    const body = await request.json();
    const holiday = await prisma.planningHoliday.create({ data: body });
    return NextResponse.json({ ok: true, data: holiday });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const holiday = await prisma.planningHoliday.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: holiday });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.planningHoliday.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const holidays = await prisma.planningHoliday.findMany({});
    return NextResponse.json({ ok: true, data: holidays });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
