import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'User exists' }, { status: 400 })
  }
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.create({ data: { email, password: hashed } })
  return NextResponse.json({ success: true })
}
