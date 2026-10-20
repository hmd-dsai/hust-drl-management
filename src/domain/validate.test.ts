import { describe, expect, it } from 'vitest'
import sample from '../../data/samples/2026.1.json'
import { getRubric } from './rubric.ts'
import type { Activity, Status, UserData } from './types.ts'
import { validate, type Issue } from './validate.ts'

const NEW = getRubric('2026.1')!
const OLD = getRubric('2025.1')!

let seq = 0
function act(chosen: string | null, eligible: string[], status: Status = 'planned'): Activity {
  seq += 1
  return { id: `a${seq}`, name: `HĐ ${seq}`, status, eligible, chosen }
}

function check(activities: Activity[], extra: Partial<UserData> = {}, rubric = NEW): Issue[] {
  const user: UserData = { schemaVersion: 1, semester: rubric.id, rubric: rubric.id, activities, ...extra }
  return validate(rubric, user)
}

const codes = (issues: Issue[]) => issues.map((i) => `${i.severity}:${i.code}`)

describe('validate', () => {
  it('sample 2026.1 không có thông báo nào', () => {
    expect(validate(NEW, sample as UserData)).toEqual([])
  })

  it('dữ liệu rỗng không có thông báo nào', () => {
    expect(check([])).toEqual([])
  })

  describe('warning', () => {
    it('chosen không nằm trong eligible', () => {
      const a = act('II.1.a', ['II.1.b'])
      expect(check([a])).toEqual([
        {
          severity: 'warning',
          code: 'chosen-not-eligible',
          message: `"${a.name}" chọn II.1.a nhưng tiêu chí này không nằm trong danh sách có thể dùng.`,
          activityId: a.id,
          criterionIds: ['II.1.a'],
        },
      ])
    })

    it('chosen hoặc eligible trỏ tới id không có trong rubric', () => {
      const a = act('X.1.a', ['X.1.a', 'II.1.a', 'II.1', 'Y.2.b'])
      const issues = check([a])
      expect(codes(issues)).toEqual(['warning:unknown-criterion'])
      expect(issues[0]).toMatchObject({ activityId: a.id, criterionIds: ['X.1.a', 'II.1', 'Y.2.b'] })
      expect(issues[0]!.message).toContain('không có trong rubric 2026.1: X.1.a, II.1, Y.2.b')
    })

    it('chosen lạ và không nằm trong eligible chỉ báo một lần', () => {
      expect(codes(check([act('X.1.a', ['II.1.a'])]))).toEqual(['warning:unknown-criterion'])
    })

    it.each<[Status, boolean]>([
      ['joined', true],
      ['confirmed', true],
      ['planned', false],
      ['rejected', false],
    ])('chưa có chosen khi status = %s → cảnh báo: %s', (status, warns) => {
      const issues = check([act(null, ['II.1.a'], status)])
      expect(codes(issues)).toEqual(warns ? ['warning:missing-chosen'] : [])
    })

    it('file ghi rubric khác với rubric đang dùng', () => {
      const issues = check([], { rubric: '2024.1', semester: '2026.1' })
      expect(issues).toMatchObject([{ severity: 'warning', code: 'unknown-rubric' }])
      expect(issues[0]!.message).toContain('"2024.1"')
    })
  })

  describe('info', () => {
    it('chosen nằm trong excludedCriteria', () => {
      const a = act('II.2.a', ['II.2.a'], 'joined')
      const issues = check([a], { excludedCriteria: ['II.2.a', 'II.3.c'] })
      expect(issues).toMatchObject([
        { severity: 'info', code: 'excluded-overridden', activityId: a.id, criterionIds: ['II.2.a'] },
      ])
    })

    it('hoạt động rejected chọn tiêu chí bị loại trừ thì không báo', () => {
      expect(check([act('II.2.a', ['II.2.a'], 'rejected')], { excludedCriteria: ['II.2.a'] })).toEqual([])
    })

    it('nhiều hoạt động cùng chọn một tiêu chí: hoạt động có trạng thái tốt hơn được giữ, gợi ý chỗ trống', () => {
      const planned = act('II.2.c', ['II.2.c', 'II.1.b', 'II.2.b', 'II.3.c'], 'planned')
      const confirmed = act('II.2.c', ['II.2.c'], 'confirmed')
      const other = act('II.2.b', ['II.2.b'], 'joined')
      const issues = check([planned, confirmed, other], { excludedCriteria: ['II.3.c'] })
      expect(issues).toEqual([
        {
          severity: 'info',
          code: 'duplicate-chosen',
          message: `"${planned.name}" chọn trùng II.2.c với "${confirmed.name}" nên không được cộng thêm điểm. Có thể chuyển sang: II.1.b.`,
          activityId: planned.id,
          criterionIds: ['II.2.c'],
          suggestions: ['II.1.b'],
        },
      ])
    })

    it('chọn trùng mà không còn chỗ trống thì không gợi ý', () => {
      const issues = check([act('IV.1.a', ['IV.1.a']), act('IV.1.a', ['IV.1.a'])])
      expect(issues).toMatchObject([{ code: 'duplicate-chosen', suggestions: [] }])
      expect(issues[0]!.message).not.toContain('Có thể chuyển sang')
    })

    it('ba hoạt động chọn trùng → hai thông báo', () => {
      const issues = check([act('IV.1.a', ['IV.1.a']), act('IV.1.a', ['IV.1.a']), act('IV.1.a', ['IV.1.a'])])
      expect(codes(issues)).toEqual(['info:duplicate-chosen', 'info:duplicate-chosen'])
    })

    it('hoạt động rejected không tính là chọn trùng', () => {
      expect(check([act('IV.1.a', ['IV.1.a']), act('IV.1.a', ['IV.1.a'], 'rejected')])).toEqual([])
    })

    it('hai tiêu chí cùng exclusiveGroup đều được chọn (rubric cũ)', () => {
      const issues = check([act('I.1.a', ['I.1.a']), act('I.1.c', ['I.1.c'], 'joined')], {}, OLD)
      expect(issues).toMatchObject([
        { severity: 'info', code: 'exclusive-conflict', criterionIds: ['I.1.a', 'I.1.c'] },
      ])
    })

    it('tiêu chí loại trừ + tiêu chí thường trong cùng nhóm thì không báo', () => {
      expect(check([act('I.1.a', ['I.1.a']), act('I.1.f', ['I.1.f'])], {}, OLD)).toEqual([])
    })
  })
})
