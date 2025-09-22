import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  
  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  
  const token = generateToken(user.id)
  return NextResponse.json({ token, userId: user.id })
}
