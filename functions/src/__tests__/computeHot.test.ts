import { Timestamp } from 'firebase-admin/firestore'
import { computeHot } from '../computeHot'

describe('computeHot', () => {
  it('computes hot for zero score', () => {
    const ts = new Timestamp(1600000000, 0)
    const v = computeHot(0, ts)
    expect(typeof v).toBe('number')
  })
  it('higher score yields higher rank', () => {
    const ts = new Timestamp(1600000000, 0)
    const low = computeHot(1, ts)
    const high = computeHot(100, ts)
    expect(high).toBeGreaterThan(low)
  })
  it('older posts decay', () => {
    const newer = new Timestamp(1700000000, 0)
    const older = new Timestamp(1600000000, 0)
    const vNew = computeHot(10, newer)
    const vOld = computeHot(10, older)
    expect(vNew).toBeGreaterThan(vOld)
  })
})
