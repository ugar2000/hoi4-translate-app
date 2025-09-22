import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  
  // Validate password strength
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'User exists' }, { status: 400 })
  }
  
  const hashedPassword = await hashPassword(password)
  const user = await prisma.user.create({ 
    data: { email, password: hashedPassword } 
  })
  
  const token = generateToken(user.id)
  return NextResponse.json({ success: true, token, userId: user.id })
}
