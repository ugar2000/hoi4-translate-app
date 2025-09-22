import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export function getUserIdFromRequest(req: Request): number | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
    return payload.userId
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' })
}
