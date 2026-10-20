import { describe, expect, it } from 'vitest'
import sample from '../../data/samples/2026.1.json'
import { bestChoice, marginalGain, rankChoices } from './optimizer.ts'
import { getRubric } from './rubric.ts'
import type { Activity, UserData } from './types.ts'

const rubric = getRubric('2026.1')!
const user = sample as UserData
// Sample, kịch bản "làm hết kế hoạch" = 63: I = 16 (I.1 = 10/15), II = 18/20 (II.1 = 6, II.2 = 12/12),
// III = 12 (III.1 = 6), IV = 7 (IV.1 = 7/12), V = 10.

function draft(eligible: string[], extra: Partial<Activity> = {}): Activity {
  return { id: 'moi', name: 'Hoạt động mới', status: 'planned', eligible, chosen: null, ...extra }
}
const existing = (id: string) => user.activities.find((a) => a.id === id)!

describe('marginalGain — hoạt động mới', () => {
  it('tiêu chí còn trống, chưa chạm trần', () => {
    expect(marginalGain(rubric, user, draft(['V.1.a']), 'V.1.a')).toBe(6)
  })

  it('bị trần nhóm cắt bớt: I.1 đang 10/15, +6 chỉ được 5', () => {
    expect(marginalGain(rubric, user, draft(['I.1.b']), 'I.1.b')).toBe(5)
  })

  it('bị trần mục lớn cắt bớt: II đang 18/20, II.1.b +3 chỉ được 2', () => {
    expect(marginalGain(rubric, user, draft(['II.1.b']), 'II.1.b')).toBe(2)
  })

  it('nhóm đã đầy → 0', () => {
    expect(marginalGain(rubric, user, draft(['II.2.a']), 'II.2.a')).toBe(0)
  })

  it('tiêu chí đã có hoạt động khác chọn → 0', () => {
    expect(marginalGain(rubric, user, draft(['IV.1.c']), 'IV.1.c')).toBe(0)
  })

  it('không chọn gì → 0; id lạ → 0', () => {
    expect(marginalGain(rubric, user, draft(['V.1.a']), null)).toBe(0)
    expect(marginalGain(rubric, user, draft(['X.1.a']), 'X.1.a')).toBe(0)
  })

  it('bản nháp có sẵn chosen vẫn tính so với null (hoạt động mới)', () => {
    expect(marginalGain(rubric, user, draft(['V.1.a'], { chosen: 'V.1.a' }), 'V.1.a')).toBe(6)
  })

  it('luôn coi hoạt động là được tính, bất kể status', () => {
    for (const status of ['planned', 'joined', 'confirmed', 'rejected'] as const) {
      expect(marginalGain(rubric, user, draft(['V.1.a'], { status }), 'V.1.a')).toBe(6)
    }
  })
})

describe('marginalGain — hoạt động đã có', () => {
  const nq = existing('2-cuoc-thi-nghi-quyet-dang') // planned, chosen III.1.a (+3)

  it('giữ nguyên tiêu chí hiện tại → 0', () => {
    expect(marginalGain(rubric, user, nq, 'III.1.a')).toBe(0)
  })

  it('chuyển sang tiêu chí ngang giá → 0', () => {
    expect(marginalGain(rubric, user, nq, 'IV.1.b')).toBe(0)
  })

  it('chuyển sang tiêu chí đã có người chọn → âm', () => {
    expect(marginalGain(rubric, user, nq, 'III.2.e')).toBe(-3)
  })

  it('bỏ chọn → âm', () => {
    expect(marginalGain(rubric, user, existing('festival-ngay-hoi-xe-dien'), null)).toBe(-3)
  })

  it('so với chosen đã lưu trong user, không phải chosen của bản nháp', () => {
    // người dùng đang sửa dòng và tạm chọn III.2.e; gain vẫn tính so với III.1.a đã lưu
    expect(marginalGain(rubric, user, { ...nq, chosen: 'III.2.e' }, 'IV.1.b')).toBe(0)
  })

  it('hoạt động rejected vẫn được coi như được tính', () => {
    const u: UserData = {
      ...user,
      activities: [...user.activities, { id: 'bi-tu-choi', name: 'R', status: 'rejected', eligible: ['V.1.a'], chosen: null }],
    }
    expect(marginalGain(rubric, u, u.activities.at(-1)!, 'V.1.a')).toBe(6)
  })

  it('không đổi dữ liệu đầu vào', () => {
    const before = structuredClone(user)
    marginalGain(rubric, user, nq, 'IV.1.b')
    expect(user).toEqual(before)
  })
})

describe('rankChoices / bestChoice', () => {
  it('xếp theo gain giảm dần, hoà thì giữ thứ tự eligible', () => {
    const a = draft(['IV.1.c', 'II.1.b', 'IV.1.b', 'I.1.b', 'IV.1.d'])
    expect(rankChoices(rubric, user, a)).toEqual([
      { criterionId: 'I.1.b', gain: 5 },
      { criterionId: 'IV.1.d', gain: 4 },
      { criterionId: 'IV.1.b', gain: 3 },
      { criterionId: 'II.1.b', gain: 2 },
      { criterionId: 'IV.1.c', gain: 0 },
    ])
    expect(bestChoice(rubric, user, a)).toBe('I.1.b')
  })

  it('bỏ qua id lạ; không có eligible thì không có lựa chọn', () => {
    expect(rankChoices(rubric, user, draft(['X.1.a', 'V.1.c']))).toEqual([{ criterionId: 'V.1.c', gain: 3 }])
    expect(bestChoice(rubric, user, draft([]))).toBeNull()
  })

  it('mọi lựa chọn đều không có lợi thì vẫn chọn cái đầu tiên (gain 0)', () => {
    expect(bestChoice(rubric, user, draft(['IV.1.c', 'II.2.a']))).toBe('IV.1.c')
  })
})
