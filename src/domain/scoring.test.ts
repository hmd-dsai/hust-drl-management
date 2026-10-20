import { describe, expect, it } from 'vitest'
import expected from '../../data/samples/2026.1.expected.json'
import sample from '../../data/samples/2026.1.json'
import { getRubric, parseRubric } from './rubric.ts'
import {
  computeScenarios,
  computeScore,
  effectiveExcluded,
  flattenScore,
  SCENARIO_KEYS,
  SCENARIOS,
  type ScoreTree,
} from './scoring.ts'
import type { Activity, Rubric, Status, UserData } from './types.ts'

// Rubric nhỏ để thử trần các tầng. Tổng max các mục (10 + 15) > totalMax (20).
const T: Rubric = {
  schemaVersion: 1,
  id: '2099.1',
  name: 'Rubric thử',
  totalMax: 20,
  categories: [
    {
      id: 'A',
      name: 'A',
      max: 10,
      groups: [
        {
          id: 'A.1',
          name: 'A.1',
          max: 6,
          criteria: [
            { id: 'A.1.a', name: 'a', points: 4 },
            { id: 'A.1.b', name: 'b', points: 4 },
            { id: 'A.1.c', name: 'c', points: 3 },
          ],
        },
        {
          id: 'A.2',
          name: 'A.2',
          max: 8,
          criteria: [
            { id: 'A.2.a', name: 'a', points: 5 },
            { id: 'A.2.b', name: 'b', points: 5 },
          ],
        },
      ],
    },
    {
      id: 'B',
      name: 'B',
      max: 15,
      groups: [
        {
          id: 'B.1',
          name: 'B.1',
          max: 15,
          criteria: [
            { id: 'B.1.a', name: 'a', points: 10 },
            { id: 'B.1.b', name: 'b', points: 5 },
          ],
        },
      ],
    },
    {
      id: 'P',
      name: 'Trừ điểm',
      kind: 'penalty',
      max: -15,
      groups: [
        {
          id: 'P.1',
          name: 'P.1',
          max: -10,
          criteria: [
            { id: 'P.1.a', name: 'a', points: -8 },
            { id: 'P.1.b', name: 'b', points: -5 },
          ],
        },
        { id: 'P.2', name: 'P.2', max: -10, criteria: [{ id: 'P.2.a', name: 'a', points: -10 }] },
      ],
    },
  ],
}

let seq = 0
function act(chosen: string | null, status: Status = 'confirmed', extra: Partial<Activity> = {}): Activity {
  seq += 1
  return { id: `a${seq}`, name: `Hoạt động ${seq}`, status, eligible: chosen ? [chosen] : [], chosen, ...extra }
}

function user(activities: Activity[], extra: Partial<UserData> = {}): UserData {
  return { schemaVersion: 1, semester: '2099.1', rubric: T.id, activities, ...extra }
}

const ALL = new Set<Status>(['confirmed', 'joined', 'planned'])

function score(activities: Activity[], rubric: Rubric = T, statuses: ReadonlySet<Status> = ALL): ScoreTree {
  return computeScore(rubric, user(activities, { rubric: rubric.id }), statuses)
}

function find(tree: ScoreTree, id: string) {
  for (const cat of tree.categories) {
    if (cat.id === id) return cat
    for (const g of cat.groups) {
      if (g.id === id) return g
      for (const c of g.criteria) if (c.id === id) return c
    }
  }
  throw new Error(`không có node ${id}`)
}

describe('sample 2026.1 (test bắt buộc)', () => {
  const rubric = getRubric(sample.rubric)!
  const scores = computeScenarios(rubric, sample as UserData)

  it.each(SCENARIO_KEYS)('kịch bản %s khớp expected.json', (key) => {
    expect(flattenScore(scores[key])).toEqual(expected[key])
  })

  it('ba tổng là 42 / 60 / 63', () => {
    expect(SCENARIO_KEYS.map((k) => scores[k].capped)).toEqual([42, 60, 63])
  })

  it('không node nào bị phí điểm', () => {
    const tree = scores.projected
    expect(tree.wasted).toBe(0)
    for (const cat of tree.categories) {
      expect(cat.wasted).toBe(0)
      for (const g of cat.groups) expect(g.wasted).toBe(0)
    }
  })
})

describe('computeScore: trần các tầng', () => {
  it('cộng điểm bình thường khi chưa chạm trần', () => {
    const t = score([act('A.1.a'), act('B.1.b')])
    expect(find(t, 'A.1')).toMatchObject({ raw: 4, capped: 4, max: 6, wasted: 0 })
    expect(t).toMatchObject({ raw: 9, capped: 9, max: 20, wasted: 0, bonus: 9, penalty: 0 })
  })

  it('vượt trần nhóm: kẹp ở max nhóm, phần dư là wasted', () => {
    const t = score([act('A.1.a'), act('A.1.b'), act('A.1.c')])
    expect(find(t, 'A.1')).toMatchObject({ raw: 11, capped: 6, max: 6, wasted: 5 })
    expect(find(t, 'A')).toMatchObject({ raw: 6, capped: 6, wasted: 0 })
  })

  it('vượt trần mục lớn: raw của mục là tổng nhóm đã kẹp', () => {
    const t = score([act('A.1.a'), act('A.1.b'), act('A.2.a')])
    expect(find(t, 'A.1')).toMatchObject({ raw: 8, capped: 6, wasted: 2 })
    expect(find(t, 'A.2')).toMatchObject({ raw: 5, capped: 5 })
    expect(find(t, 'A')).toMatchObject({ raw: 11, capped: 10, max: 10, wasted: 1 })
    expect(t.capped).toBe(10)
  })

  it('vượt totalMax', () => {
    const t = score([act('A.1.a'), act('A.1.b'), act('A.2.a'), act('B.1.a'), act('B.1.b')])
    expect(find(t, 'B')).toMatchObject({ capped: 15 })
    expect(t).toMatchObject({ bonus: 25, raw: 25, capped: 20, max: 20, wasted: 5 })
  })
})

describe('computeScore: mục penalty', () => {
  it('kẹp theo trần dưới ở nhóm và mục, rồi trừ vào tổng sau khi kẹp totalMax', () => {
    const t = score([
      ...['A.1.a', 'A.1.b', 'A.2.a', 'B.1.a', 'B.1.b'].map((id) => act(id)),
      act('P.1.a'),
      act('P.1.b'),
      act('P.2.a'),
    ])
    expect(find(t, 'P.1')).toMatchObject({ raw: -13, capped: -10, max: -10, wasted: -3 })
    expect(find(t, 'P.2')).toMatchObject({ raw: -10, capped: -10 })
    expect(find(t, 'P')).toMatchObject({ raw: -20, capped: -15, max: -15 })
    // min(25, 20) − 15
    expect(t).toMatchObject({ bonus: 25, penalty: -15, capped: 5 })
  })

  it('tổng không âm', () => {
    const t = score([act('A.1.a'), act('P.2.a')])
    expect(t).toMatchObject({ bonus: 4, penalty: -10, raw: -6, capped: 0 })
  })

  it('penalty trên rubric cũ', () => {
    const t = score([act('P.1.b'), act('P.2.b'), act('IV.1.a')], getRubric('2025.1')!)
    expect(find(t, 'P')).toMatchObject({ raw: -40, capped: -40, max: -50 })
    expect(find(t, 'P.2')).toMatchObject({ raw: -20, capped: -20, max: -20 })
    expect(t.capped).toBe(0)
  })
})

describe('computeScore: exclusiveGroup (rubric cũ)', () => {
  const old = getRubric('2025.1')!

  it('các mức GPA chỉ tính mức cao nhất', () => {
    const t = score([act('I.1.c'), act('I.1.a')], old)
    expect(find(t, 'I.1.a')).toMatchObject({ active: true, raw: 20, capped: 20 })
    expect(find(t, 'I.1.c')).toMatchObject({ active: true, raw: 16, capped: 0, wasted: 16 })
    // raw của nhóm tính sau khi gộp exclusiveGroup
    expect(find(t, 'I.1')).toMatchObject({ raw: 20, capped: 20, wasted: 0 })
  })

  it('mức loại trừ vẫn cộng với tiêu chí thường cùng nhóm, rồi mới kẹp trần', () => {
    const t = score([act('I.1.b'), act('I.1.d'), act('I.1.f')], old)
    expect(find(t, 'I.1')).toMatchObject({ raw: 26, capped: 24, max: 24 })
  })

  it('các mức cán bộ lớp', () => {
    const t = score([act('III.3.c'), act('III.3.b')], old)
    expect(find(t, 'III.3')).toMatchObject({ raw: 4, capped: 4 })
  })

  it('mức thấp được tính khi mức cao không thuộc kịch bản', () => {
    const acts = [act('I.1.e', 'confirmed'), act('I.1.a', 'planned')]
    expect(find(score(acts, old, SCENARIOS.confirmed.statuses), 'I.1').capped).toBe(12)
    expect(find(score(acts, old, SCENARIOS.projected.statuses), 'I.1').capped).toBe(20)
  })
})

describe('computeScore: kích hoạt tiêu chí', () => {
  it('hai hoạt động chọn cùng một tiêu chí chỉ tính 1 lần', () => {
    const a = act('A.2.a')
    const b = act('A.2.a', 'joined')
    const t = score([a, b])
    expect(find(t, 'A.2.a')).toMatchObject({ capped: 5, activityIds: [a.id, b.id] })
    expect(find(t, 'A.2')).toMatchObject({ raw: 5, capped: 5 })
  })

  it('chosen = null không tính gì', () => {
    const t = score([act(null), act(null, 'planned', { eligible: ['A.1.a'] })])
    expect(t.capped).toBe(0)
    expect(find(t, 'A.1.a')).toMatchObject({ active: false, activityIds: [] })
  })

  it('hoạt động rejected không được tính ở kịch bản nào', () => {
    const user0 = user([act('B.1.a', 'rejected'), act('A.1.a', 'planned')])
    const s = computeScenarios(T, user0)
    expect([s.confirmed.capped, s.done.capped, s.projected.capped]).toEqual([0, 0, 4])
    expect(find(s.projected, 'B.1.a')).toMatchObject({ active: false })
  })

  it('mỗi kịch bản chỉ lấy đúng các trạng thái của nó', () => {
    const s = computeScenarios(T, user([act('A.1.a', 'confirmed'), act('A.2.a', 'joined'), act('B.1.a', 'planned')]))
    expect([s.confirmed.capped, s.done.capped, s.projected.capped]).toEqual([4, 9, 19])
  })

  it('tiêu chí trong excludedCriteria mà vẫn được chọn thì vẫn tính điểm', () => {
    const t = computeScore(T, user([act('A.1.a')], { excludedCriteria: ['A.1.a'] }), ALL)
    expect(t.capped).toBe(4)
  })

  it('bỏ qua chosen trỏ tới id lạ hoặc id không phải tiêu chí', () => {
    expect(score([act('Z.9.z'), act('A.1'), act('A')]).capped).toBe(0)
  })

  it('không đổi dữ liệu đầu vào', () => {
    const u = user([act('A.1.a'), act('A.1.b')])
    const before = structuredClone(u)
    computeScenarios(T, u)
    expect(u).toEqual(before)
  })
})

describe('effectiveExcluded', () => {
  it('bỏ các tiêu chí đang được hoạt động không bị rejected chọn', () => {
    const u = user([act('A.1.a', 'planned'), act('A.1.b', 'rejected')], {
      excludedCriteria: ['A.1.a', 'A.1.b', 'B.1.a'],
    })
    expect([...effectiveExcluded(u)]).toEqual(['A.1.b', 'B.1.a'])
  })

  it('excludedCriteria vắng mặt coi như rỗng', () => {
    expect(effectiveExcluded(user([])).size).toBe(0)
  })
})

it('rubric thử có cấu trúc hợp lệ', () => {
  expect(parseRubric(T).ok).toBe(true)
})
