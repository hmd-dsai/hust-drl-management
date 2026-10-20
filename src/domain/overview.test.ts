import { describe, expect, it } from 'vitest'
import sample from '../../data/samples/2026.1.json'
import { gradeOf, nextGrade } from './grading.ts'
import { criterionInfo, fullAt, scoreNodes } from './overview.ts'
import { getRubric } from './rubric.ts'
import { computeScenarios } from './scoring.ts'
import type { Activity, UserData } from './types.ts'

const rubric = getRubric('2026.1')!
const user = sample as UserData

describe('gradeOf / nextGrade', () => {
  it.each([
    [100, 'Xuất sắc'],
    [90, 'Xuất sắc'],
    [89.5, 'Tốt'],
    [80, 'Tốt'],
    [65, 'Khá'],
    [63, 'Trung bình'],
    [50, 'Trung bình'],
    [35, 'Yếu'],
    [34, 'Kém'],
    [0, 'Kém'],
  ])('%s điểm → %s', (score, label) => {
    expect(gradeOf(score).label).toBe(label)
  })

  it('điểm còn thiếu để lên mức trên', () => {
    expect(nextGrade(63)).toEqual({ grade: { label: 'Khá', min: 65 }, gap: 2 })
    expect(nextGrade(0)).toEqual({ grade: { label: 'Yếu', min: 35 }, gap: 35 })
    expect(nextGrade(95)).toBeNull()
  })
})

describe('criterionInfo (sample 2026.1)', () => {
  const info = criterionInfo(rubric, user)

  it('có đủ mọi tiêu chí', () => {
    const count = rubric.categories.flatMap((c) => c.groups.flatMap((g) => g.criteria)).length
    expect(info.size).toBe(count)
  })

  it('tiêu chí đã chọn: hoạt động chọn nó và trạng thái tốt nhất', () => {
    expect(info.get('II.2.b')).toMatchObject({ best: 'joined', excluded: false })
    expect(info.get('II.2.b')!.chosenBy.map((a) => a.id)).toEqual(['tham-gia-ai-thuc-chien-2026'])
    expect(info.get('III.1.a')!.best).toBe('planned')
    expect(info.get('IV.1.c')!.best).toBe('confirmed')
  })

  it('hoạt động có thể dùng nhưng đang gán chỗ khác', () => {
    // III.2.e: HUST Club Day chọn nó; PTCC, Festival, 2 cuộc thi NQ có thể dùng nhưng gán chỗ khác
    const e = info.get('III.2.e')!
    expect(e.chosenBy.map((a) => a.id)).toEqual(['hust-club-day'])
    expect(e.elsewhere.map((a) => a.id)).toEqual(['su-dung-ptcc', 'festival-ngay-hoi-xe-dien', '2-cuoc-thi-nghi-quyet-dang'])
    expect(info.get('II.1.b')!).toMatchObject({ best: null })
    expect(info.get('II.1.b')!.elsewhere.map((a) => a.id)).toEqual(['tham-gia-ai-thuc-chien-2026'])
  })

  it('tiêu chí bị loại trừ', () => {
    expect(info.get('II.3.c')).toMatchObject({ excluded: true, excludedOverridden: false, best: null })
  })

  it('loại trừ bị lựa chọn thực tế ghi đè; rejected không tính', () => {
    const extra: Activity[] = [
      { id: 'x', name: 'X', status: 'planned', eligible: ['II.3.c'], chosen: 'II.3.c' },
      { id: 'y', name: 'Y', status: 'rejected', eligible: ['II.3.d'], chosen: 'II.3.d' },
      { id: 'z', name: 'Z', status: 'confirmed', eligible: ['II.3.c'], chosen: 'II.3.c' },
    ]
    const i2 = criterionInfo(rubric, { ...user, activities: [...user.activities, ...extra] })
    expect(i2.get('II.3.c')).toMatchObject({ excluded: false, excludedOverridden: true, best: 'confirmed' })
    expect(i2.get('II.3.d')).toMatchObject({ excluded: true, best: null, chosenBy: [] })
    expect(i2.get('II.3.d')!.eligible.map((a) => a.id)).toEqual(['y'])
    expect(i2.get('II.3.d')!.elsewhere).toEqual([])
  })
})

describe('scoreNodes / fullAt (sample 2026.1)', () => {
  const nodes = scoreNodes(computeScenarios(rubric, user))

  it('tra điểm theo id và kịch bản', () => {
    expect(nodes.confirmed.get('total')!.capped).toBe(42)
    expect(nodes.done.get('II')!.capped).toBe(18)
    expect(nodes.projected.get('III.1.a')!.capped).toBe(3)
  })

  it('kịch bản sớm nhất chạm trần', () => {
    expect(fullAt(nodes, 'II.2')).toBe('done')
    expect(fullAt(nodes, 'I.1')).toBeNull()
    expect(fullAt(nodes, 'II')).toBeNull()
    expect(fullAt(nodes, 'không có')).toBeNull()
  })
})
