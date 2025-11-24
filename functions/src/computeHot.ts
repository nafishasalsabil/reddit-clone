import { Timestamp } from 'firebase-admin/firestore'

export function computeHot(score: number, createdAt: Timestamp): number {
  const s = score > 0 ? 1 : score < 0 ? -1 : 0
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const seconds = createdAt.seconds - 1134028003
  const hot = s * order + seconds / 45000
  return Number(hot.toFixed(7))
}
