export async function POST(request) {
  try {
    const body = await request.json();
    const workingHour = await prisma.workingHour.create({ data: body });
    return NextResponse.json({ ok: true, data: workingHour });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const workingHour = await prisma.workingHour.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: workingHour });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.workingHour.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workingHours = await prisma.workingHour.findMany({});
    return NextResponse.json({ ok: true, data: workingHours });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
