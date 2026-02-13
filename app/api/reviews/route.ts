export async function POST(request) {
  try {
    const body = await request.json();
    const review = await prisma.review.create({ data: body });
    return NextResponse.json({ ok: true, data: review });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const review = await prisma.review.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: review });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({ include: { client: true, staff: true, appointment: true } });
    return NextResponse.json({ ok: true, data: reviews });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
