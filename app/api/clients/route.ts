export async function POST(request) {
  try {
    const body = await request.json();
    const client = await prisma.user.create({ data: { ...body, role: 'CLIENT' } });
    return NextResponse.json({ ok: true, data: client });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const client = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: client });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.user.findMany({ where: { role: 'CLIENT' } });
    return NextResponse.json({ ok: true, data: clients });
  } catch (e) {
    return NextResponse.json({ ok: false, error: { message: e.message } }, { status: 500 });
  }
}
