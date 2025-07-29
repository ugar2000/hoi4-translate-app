import jwt from 'jsonwebtoken'

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
