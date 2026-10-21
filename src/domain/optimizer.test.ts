import { describe, expect, it } from 'vitest'
import sample from '../../data/samples/2026.1.json'
import {
  applyChanges,
  bestChoice,
  contribution,
  createFastScorer,
  marginalGain,
  openCategories,
  openGroups,
  optimize,
  rankChoices,
} from './optimizer.ts'
import { getRubric } from './rubric.ts'
import { computeScenarios } from './scoring.ts'
import type { Activity, Rubric, Status, UserData } from './types.ts'

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

// ======================================================================
// Bộ tối ưu toàn cục (SPEC mục 6)
// ======================================================================

// Rubric thử:
//   A.1 (max 8): A.1.a 6, A.1.b 6   — nhóm "gần đầy" khi đã có A.1.a
//   A.2 (max 6): A.2.a 3, A.2.b 3   — nhóm còn trống
//   B.1 (max 10): B.1.a 6 ; B.2 (max 10): B.2.a 3
const T: Rubric = {
  schemaVersion: 1,
  id: '2099.1',
  name: 'Rubric thử',
  totalMax: 100,
  categories: [
    {
      id: 'A',
      name: 'A',
      max: 20,
      groups: [
        { id: 'A.1', name: 'A.1', max: 8, criteria: [{ id: 'A.1.a', name: 'a', points: 6 }, { id: 'A.1.b', name: 'b', points: 6 }] },
        { id: 'A.2', name: 'A.2', max: 6, criteria: [{ id: 'A.2.a', name: 'a', points: 3 }, { id: 'A.2.b', name: 'b', points: 3 }] },
      ],
    },
    {
      id: 'B',
      name: 'B',
      max: 20,
      groups: [
        { id: 'B.1', name: 'B.1', max: 10, criteria: [{ id: 'B.1.a', name: 'a', points: 6 }] },
        { id: 'B.2', name: 'B.2', max: 10, criteria: [{ id: 'B.2.a', name: 'a', points: 3 }] },
      ],
    },
  ],
}

function act(id: string, status: Status, eligible: string[], chosen: string | null, extra: Partial<Activity> = {}): Activity {
  return { id, name: id.toUpperCase(), status, eligible, chosen, ...extra }
}
function u(activities: Activity[], extra: Partial<UserData> = {}): UserData {
  return { schemaVersion: 1, semester: '2099.1', rubric: '2099.1', activities, ...extra }
}
const projected = (rubric: Rubric, user: UserData) => computeScenarios(rubric, user).projected.capped

describe('optimize', () => {
  it('(a) 6đ vào nhóm gần đầy kém hơn 3đ vào nhóm còn trống', () => {
    const user = u([act('co-dinh', 'confirmed', ['A.1.a'], 'A.1.a'), act('f', 'planned', ['A.1.b', 'A.2.a'], null)])
    // greedy theo điểm danh nghĩa: chọn A.1.b (6đ) nhưng A.1 chỉ còn 2đ trống
    const naive = projected(T, applyChanges(user, [{ activityId: 'f', from: null, to: 'A.1.b', gain: 0 }]))
    expect(naive).toBe(8)
    const res = optimize(T, user)
    expect(res.method).toBe('exact')
    expect(res.changes).toEqual([{ activityId: 'f', from: null, to: 'A.2.a', gain: 3 }])
    expect(res.after.projected).toBe(9)
    expect(res.after.projected).toBeGreaterThan(naive)
  })

  it('(a) greedy theo gain biên vẫn sai khi hai hoạt động tranh một tiêu chí; tối ưu chính xác thì đúng', () => {
    const user = u([act('a', 'planned', ['B.1.a', 'B.2.a'], null), act('b', 'planned', ['B.1.a'], null)])
    const greedy = optimize(T, user, { nodeLimit: 0 })
    expect(greedy.method).toBe('greedy')
    expect(greedy.after.projected).toBe(6) // a lấy B.1.a, b hết chỗ
    const exact = optimize(T, user)
    expect(exact.method).toBe('exact')
    expect(exact.after.projected).toBe(9) // a → B.2.a, b → B.1.a
    expect(exact.assignment).toEqual({ a: 'B.2.a', b: 'B.1.a' })
  })

  it('(b) hoạt động confirmed và pinned không bị đổi', () => {
    for (const fixed of [act('c', 'confirmed', ['B.1.a', 'B.2.a'], 'B.1.a'), act('c', 'planned', ['B.1.a', 'B.2.a'], 'B.1.a', { pinned: true })]) {
      const user = u([fixed, act('d', 'planned', ['B.1.a'], null)])
      const res = optimize(T, user)
      // nếu được đổi c → B.2.a thì d lấy B.1.a = 9; nhưng c cố định nên chỉ được 6
      expect(res.after.projected).toBe(6)
      expect(res.changes).toEqual([])
      expect(res.assignment).not.toHaveProperty('c')
    }
  })

  it('(c) excludedCriteria bị bỏ qua', () => {
    const user = u([act('f', 'planned', ['A.1.b', 'A.2.a'], null)], { excludedCriteria: ['A.1.b'] })
    const res = optimize(T, user)
    expect(res.changes).toEqual([{ activityId: 'f', from: null, to: 'A.2.a', gain: 3 }])
  })

  it('(c) tiêu chí bị loại trừ nhưng đang được chọn thì không còn bị loại trừ (SPEC mục 5)', () => {
    const user = u([act('f', 'planned', ['A.1.b', 'A.2.a'], 'A.1.b')], { excludedCriteria: ['A.1.b'] })
    expect(optimize(T, user).changes).toEqual([])
  })

  it('(d) sample 2026.1: điểm "làm hết kế hoạch" sau tối ưu ≥ 63', () => {
    const res = optimize(rubric, user)
    expect(res.method).toBe('exact')
    expect(res.before).toEqual({ confirmed: 42, done: 60, projected: 63 })
    expect(res.after.projected).toBeGreaterThanOrEqual(63)
    // sample đã tối ưu; các lựa chọn ngang điểm (III.1.a / IV.1.b) giữ nguyên vì ít thay đổi nhất
    expect(res.changes).toEqual([])
    expect(Object.keys(res.assignment).sort()).toEqual(
      ['2-cuoc-thi-nghi-quyet-dang', 'hop-lop', 'tham-gia-ai-thuc-chien-2026', 'thanh-vien-gdg-hust'].sort(),
    )
  })

  it('hoà điểm "làm hết kế hoạch" thì ưu tiên điểm "đã tham gia"', () => {
    // a (joined) và b (planned) đều chỉ dùng được B.1.a; b đang giữ nó → projected như nhau, done cao hơn nếu a giữ
    const user = u([act('a', 'joined', ['B.1.a'], null), act('b', 'planned', ['B.1.a'], 'B.1.a')])
    const res = optimize(T, user)
    expect(res.before).toMatchObject({ done: 0, projected: 6 })
    expect(res.after).toMatchObject({ done: 6, projected: 6 })
    expect(res.changes).toEqual([{ activityId: 'a', from: null, to: 'B.1.a', gain: 0 }])
  })

  it('hoà cả hai kịch bản thì giữ cách gán hiện tại', () => {
    const user = u([act('a', 'planned', ['A.2.a', 'A.2.b'], 'A.2.b'), act('b', 'planned', ['A.2.a', 'A.2.b'], 'A.2.a')])
    expect(optimize(T, user).changes).toEqual([])
  })

  it('hoạt động rejected và penalty không bị đổi (rubric cũ)', () => {
    const old = getRubric('2025.1')!
    const user: UserData = {
      schemaVersion: 1,
      semester: '2025.1',
      rubric: '2025.1',
      activities: [
        act('vi-pham', 'planned', ['P.1.a'], 'P.1.a'),
        act('bi-tu-choi', 'rejected', ['IV.1.a'], null),
        act('nen-1', 'confirmed', ['II.1.a'], 'II.1.a'),
        act('nen-2', 'confirmed', ['II.1.b'], 'II.1.b'),
        act('tu-do', 'planned', ['IV.1.b'], null),
      ],
    }
    const res = optimize(old, user)
    // bỏ vi phạm sẽ tăng điểm, nhưng penalty là bắt buộc; rejected không được đụng tới
    expect(res.assignment).toEqual({ 'tu-do': 'IV.1.b' })
    expect(res.before.projected).toBe(4) // 7 + 7 − 10
    expect(res.after.projected).toBe(8)
  })

  it('không bao giờ gợi ý cách gán tệ hơn hiện tại, kể cả khi dùng greedy', () => {
    for (const nodeLimit of [0, 1, 5]) {
      const res = optimize(rubric, user, { nodeLimit })
      expect(res.after.projected).toBeGreaterThanOrEqual(res.before.projected)
      if (res.after.projected === res.before.projected) expect(res.after.done).toBeGreaterThanOrEqual(res.before.done)
    }
  })

  it('chosen hiện tại nằm ngoài eligible vẫn được giữ nếu tốt hơn (không bao giờ làm mất điểm)', () => {
    const user = u([act('f', 'planned', ['A.2.a'], 'B.1.a')])
    expect(optimize(T, user).changes).toEqual([])
  })

  it('chosen hiện tại nằm ngoài eligible bị thay nếu có lựa chọn tốt hơn; id lạ thì bị bỏ', () => {
    const user = u([act('f', 'planned', ['B.1.a'], 'A.2.a'), act('g', 'planned', ['A.2.b'], 'X.1.a')])
    expect(optimize(T, user).changes).toEqual([
      { activityId: 'f', from: 'A.2.a', to: 'B.1.a', gain: 3 },
      { activityId: 'g', from: 'X.1.a', to: 'A.2.b', gain: 3 },
    ])
  })

  it('đủ nhanh với 20 hoạt động tự do × 5 lựa chọn', () => {
    const ids = rubric.categories.flatMap((c) => c.groups.flatMap((g) => g.criteria.map((k) => k.id)))
    let seed = 7
    const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    const acts = Array.from({ length: 20 }, (_, i) =>
      act(`hd-${i}`, rand() < 0.5 ? 'planned' : 'joined', [...new Set(Array.from({ length: 5 }, () => ids[Math.floor(rand() * ids.length)]!))], null),
    )
    const t0 = performance.now()
    const res = optimize(rubric, { ...user, activities: [...user.activities, ...acts] })
    expect(performance.now() - t0).toBeLessThan(3000)
    expect(res.after.projected).toBeGreaterThanOrEqual(res.before.projected)
  })
})

describe('applyChanges', () => {
  it('áp dụng tất cả cho ra đúng điểm "sau"', () => {
    const user = u([act('a', 'planned', ['B.1.a', 'B.2.a'], 'B.1.a'), act('b', 'planned', ['B.1.a'], null)])
    const res = optimize(T, user)
    const applied = applyChanges(user, res.changes)
    const s = computeScenarios(T, applied)
    expect({ confirmed: s.confirmed.capped, done: s.done.capped, projected: s.projected.capped }).toEqual(res.after)
  })

  it('áp dụng từng dòng; chọn tiêu chí bị loại trừ thì tự bỏ loại trừ', () => {
    const user = u([act('a', 'planned', ['A.1.a'], null)], { excludedCriteria: ['A.1.a'] })
    const applied = applyChanges(user, [{ activityId: 'a', from: null, to: 'A.1.a', gain: 6 }])
    expect(applied.activities[0]!.chosen).toBe('A.1.a')
    expect(applied.excludedCriteria).toEqual([])
  })
})

describe('createFastScorer', () => {
  it('cho cùng kết quả với computeScore trên tập tiêu chí ngẫu nhiên (cả 2 rubric)', () => {
    let seed = 42
    const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    for (const r of [getRubric('2025.1')!, getRubric('2026.1')!, T]) {
      const scorer = createFastScorer(r)
      const ids = r.categories.flatMap((c) => c.groups.flatMap((g) => g.criteria.map((k) => k.id)))
      for (let trial = 0; trial < 300; trial++) {
        const active = ids.filter(() => rand() < rand())
        const user0 = u(active.map((id, i) => act(`x${i}`, 'confirmed', [id], id)), { rubric: r.id })
        const counts = new Int32Array(scorer.size)
        for (const id of active) counts[scorer.indexOf(id)!]! += 1
        expect(scorer.total(counts)).toBe(computeScenarios(r, user0).confirmed.capped)
      }
    }
  })
})

describe('openGroups (sample 2026.1)', () => {
  const groups = openGroups(rubric, user)

  it('xếp theo số điểm còn lấy được thật (tính cả trần mục), giảm dần', () => {
    expect(groups.slice(0, 5).map((g) => [g.groupId, g.room])).toEqual([
      ['V.1', 10],
      ['V.2', 10],
      ['I.2', 9],
      ['III.1', 8],
      ['IV.2', 8],
    ])
    // II.1 còn 9đ theo trần nhóm nhưng mục II chỉ còn 2đ; II.2 đã đầy thì không có
    expect(groups.find((g) => g.groupId === 'II.1')!.room).toBe(2)
    expect(groups.find((g) => g.groupId === 'II.2')).toBeUndefined()
  })

  it('kèm các tiêu chí còn trống rẻ nhất, bỏ tiêu chí đã chọn và bị loại trừ', () => {
    expect(groups.find((g) => g.groupId === 'V.1')!.criteria.map((c) => [c.id, c.points])).toEqual([
      ['V.1.c', 3],
      ['V.1.b', 4],
      ['V.1.a', 6],
    ])
    expect(groups.find((g) => g.groupId === 'I.2')!.criteria.map((c) => c.id)).toEqual(['I.2.b', 'I.2.c'])
    expect(groups.find((g) => g.groupId === 'II.3')!.criteria.map((c) => c.id)).toEqual(['II.3.a', 'II.3.b'])
  })
})

describe('optimize = vét cạn trên dữ liệu ngẫu nhiên nhỏ', () => {
  it('cùng điểm (projected, done) và cùng số thay đổi tối thiểu', () => {
    let seed = 2026
    const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647
    const pickFrom = <X,>(xs: X[]) => xs[Math.floor(rand() * xs.length)]!
    for (const r of [getRubric('2025.1')!, rubric, T]) {
      const ids = r.categories.filter((c) => c.kind !== 'penalty').flatMap((c) => c.groups.flatMap((g) => g.criteria.map((k) => k.id)))
      const pool = Array.from({ length: 8 }, () => pickFrom(ids)) // ít tiêu chí để hay tranh nhau / chạm trần
      for (let trial = 0; trial < 70; trial++) {
        const n = 1 + Math.floor(rand() * 6)
        const acts = Array.from({ length: n }, (_, i) => {
          const eligible = [...new Set(Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pickFrom(pool)))]
          const chosen = rand() < 0.5 ? pickFrom(eligible) : null
          return act(`a${i}`, pickFrom(['planned', 'joined', 'confirmed'] as const), eligible, chosen)
        })
        const user0 = u(acts, { rubric: r.id, excludedCriteria: rand() < 0.3 ? [pickFrom(pool)] : [] })
        const res = optimize(r, user0)

        // vét cạn
        const excl = new Set(user0.excludedCriteria)
        const freeActs = acts.filter((a) => a.status !== 'confirmed')
        const opts = freeActs.map((a) => [...new Set([a.chosen, ...a.eligible.filter((id) => !excl.has(id) || acts.some((b) => b.chosen === id)), null])])
        let best = { p: -1, d: -1, c: Infinity }
        const rec = (i: number, cur: Activity[], c: number) => {
          if (i === freeActs.length) {
            const s = computeScenarios(r, u(cur, { rubric: r.id }))
            const p = s.projected.capped
            const d = s.done.capped
            if (p > best.p || (p === best.p && (d > best.d || (d === best.d && c < best.c)))) best = { p, d, c }
            return
          }
          for (const o of opts[i]!) {
            const a = freeActs[i]!
            rec(i + 1, cur.map((x) => (x.id === a.id ? { ...x, chosen: o } : x)), c + (o === a.chosen ? 0 : 1))
          }
        }
        rec(0, acts, 0)
        expect([res.after.projected, res.after.done, res.changes.length], JSON.stringify(user0)).toEqual([best.p, best.d, best.c])
      }
    }
  })
})

describe('contribution — điểm hoạt động đang đóng góp', () => {
  const withActivities = (activities: Activity[]): UserData => ({ ...user, activities })

  it('tiêu chí riêng, chưa chạm trần: đúng bằng điểm tiêu chí', () => {
    expect(contribution(rubric, user, 'xuat-sac-2025-2')).toBe(6)
    expect(contribution(rubric, user, 'tot-2025-2')).toBe(4)
  })

  it('hoạt động joined vẫn tính theo kịch bản "làm hết kế hoạch": II.2 từ 12 xuống 6', () => {
    expect(contribution(rubric, user, 'tham-gia-ai-thuc-chien-2026')).toBe(6)
  })

  it('hai hoạt động cùng chọn một tiêu chí: bỏ riêng cái nào cũng không mất điểm → 0', () => {
    const dup = withActivities([...user.activities, { ...existing('su-dung-ptcc'), id: 'trung' }])
    expect(contribution(rubric, dup, 'su-dung-ptcc')).toBe(0)
    expect(contribution(rubric, dup, 'trung')).toBe(0)
  })

  it('rejected, chưa chọn tiêu chí, id không tồn tại → 0', () => {
    const rejected = withActivities(user.activities.map((a) => (a.id === 'tot-2025-2' ? { ...a, status: 'rejected' as Status } : a)))
    expect(contribution(rubric, rejected, 'tot-2025-2')).toBe(0)
    const unchosen = withActivities(user.activities.map((a) => (a.id === 'tot-2025-2' ? { ...a, chosen: null } : a)))
    expect(contribution(rubric, unchosen, 'tot-2025-2')).toBe(0)
    expect(contribution(rubric, user, 'khong-co')).toBe(0)
  })
})

describe('openCategories (sample 2026.1)', () => {
  const cats = openCategories(rubric, user)

  it('gom nhóm theo mục, mục xếp theo điểm còn lấy được của cả mục', () => {
    // V còn 10 (20 − 10), I còn 9, III và IV còn 8 (giữ thứ tự rubric), II còn 2
    expect(cats.map((c) => [c.categoryId, c.room])).toEqual([
      ['V', 10],
      ['I', 9],
      ['III', 8],
      ['IV', 8],
      ['II', 2],
    ])
  })

  it('V.1, V.2 còn 10, V.3 còn 5 nhưng cả mục V chỉ còn 10: không cộng dồn', () => {
    const v = cats.find((c) => c.categoryId === 'V')!
    expect(v.groups.map((g) => [g.groupId, g.room])).toEqual([
      ['V.1', 10],
      ['V.2', 10],
      ['V.3', 5],
    ])
    expect(v.room).toBe(10)
  })

  it('nhóm trong mục xếp theo room giảm dần, tiêu chí xếp điểm cao xuống', () => {
    const i = cats.find((c) => c.categoryId === 'I')!
    expect(i.groups.map((g) => g.groupId)).toEqual(['I.2', 'I.1'])
    expect(cats.find((c) => c.categoryId === 'V')!.groups[0]!.criteria.map((c) => [c.id, c.points])).toEqual([
      ['V.1.a', 6],
      ['V.1.b', 4],
      ['V.1.c', 3],
    ])
  })
})
