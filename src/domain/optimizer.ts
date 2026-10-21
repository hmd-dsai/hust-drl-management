// Gợi ý gán tiêu chí (SPEC mục 6): marginalGain cho form nhập, và bộ tối ưu toàn cục cho màn hình Gợi ý.

import { patchActivity } from './activities.ts'
import { rubricIndex } from './rubric.ts'
import { computeScenarios, computeScore, effectiveExcluded, SCENARIOS, type ScenarioKey } from './scoring.ts'
import type { Activity, Rubric, UserData } from './types.ts'

// ---------- marginalGain ----------

/** Thay (hoặc thêm) hoạt động vào `user`, coi như được tính trong kịch bản "làm hết kế hoạch". */
function withActivity(user: UserData, activity: Activity, chosen: string | null): UserData {
  const replaced: Activity = { ...activity, status: 'planned', chosen }
  const exists = user.activities.some((a) => a.id === activity.id)
  return {
    ...user,
    activities: exists ? user.activities.map((a) => (a.id === activity.id ? replaced : a)) : [...user.activities, replaced],
  }
}

/**
 * Điểm "Nếu làm hết kế hoạch" tăng bao nhiêu nếu gán `activity` vào `criterionId`, so với `chosen`
 * đang lưu trong `user` (null nếu là hoạt động mới). Có thể bằng 0 hoặc âm.
 */
export function marginalGain(rubric: Rubric, user: UserData, activity: Activity, criterionId: string | null): number {
  const baseline = user.activities.find((a) => a.id === activity.id)?.chosen ?? null
  const score = (chosen: string | null) =>
    computeScore(rubric, withActivity(user, activity, chosen), SCENARIOS.projected.statuses).capped
  return score(criterionId) - score(baseline)
}

/**
 * Điểm "Nếu làm hết kế hoạch" mà hoạt động đang đóng góp: điểm hiện có trừ điểm khi bỏ tiêu chí của nó
 * (giữ nguyên trạng thái thật). Bằng 0 nếu hoạt động bị rejected, chưa chọn, trùng tiêu chí với hoạt động khác
 * hoặc nhóm/mục đã đầy; âm với hoạt động trừ điểm.
 */
export function contribution(rubric: Rubric, user: UserData, activityId: string): number {
  const activity = user.activities.find((a) => a.id === activityId)
  if (!activity || activity.chosen === null) return 0
  const without: UserData = {
    ...user,
    activities: user.activities.map((a) => (a.id === activityId ? { ...a, chosen: null } : a)),
  }
  const score = (u: UserData) => computeScore(rubric, u, SCENARIOS.projected.statuses).capped
  return score(user) - score(without)
}

export interface Choice {
  criterionId: string
  gain: number
}

/** Các tiêu chí eligible (có trong rubric) kèm gain, gain giảm dần; hoà thì giữ thứ tự trong `eligible`. */
export function rankChoices(rubric: Rubric, user: UserData, activity: Activity): Choice[] {
  const index = rubricIndex(rubric)
  return activity.eligible
    .filter((id) => index.get(id)?.kind === 'criterion')
    .map((criterionId) => ({ criterionId, gain: marginalGain(rubric, user, activity, criterionId) }))
    .sort((a, b) => b.gain - a.gain)
}

/** Lựa chọn mặc định cho form: gain cao nhất, hoặc `null` nếu không có eligible hợp lệ. */
export function bestChoice(rubric: Rubric, user: UserData, activity: Activity): string | null {
  return rankChoices(rubric, user, activity)[0]?.criterionId ?? null
}

// ---------- Bộ tính điểm nhanh ----------

/**
 * Tính tổng điểm từ mảng đếm số hoạt động chọn mỗi tiêu chí, không cấp phát gì.
 * Cho cùng kết quả với `computeScore(...).capped` (có test đối chiếu); dùng trong vòng lặp của bộ tối ưu.
 */
export interface FastScorer {
  /** Số tiêu chí; độ dài mảng đếm. */
  size: number
  indexOf(criterionId: string): number | undefined
  idAt(i: number): string
  pointsAt(i: number): number
  /** Chỉ số mục lớn chứa tiêu chí. */
  catAt(i: number): number
  total(counts: Int32Array): number
  /** Σ điểm các mục bonus (đã kẹp theo mục, chưa kẹp totalMax). */
  bonusSum(counts: Int32Array): number
}

export function createFastScorer(rubric: Rubric): FastScorer {
  const ids: string[] = []
  const points: number[] = []
  /** Chỉ số exclusiveGroup trong nhóm, -1 nếu không có. */
  const exKey: number[] = []
  const catOf: number[] = []
  const groups: { start: number; end: number; max: number; keys: number }[][] = []
  const cats = rubric.categories.map((cat, ci) => {
    groups[ci] = cat.groups.map((g) => {
      const start = ids.length
      const keys = new Map<string, number>()
      for (const c of g.criteria) {
        ids.push(c.id)
        points.push(c.points)
        catOf.push(ci)
        if (c.exclusiveGroup === undefined) exKey.push(-1)
        else {
          if (!keys.has(c.exclusiveGroup)) keys.set(c.exclusiveGroup, keys.size)
          exKey.push(keys.get(c.exclusiveGroup)!)
        }
      }
      return { start, end: ids.length, max: g.max, keys: keys.size }
    })
    return { max: cat.max, penalty: cat.kind === 'penalty' }
  })
  const pos = new Map(ids.map((id, i) => [id, i]))
  const best = new Float64Array(Math.max(1, ...groups.flat().map((g) => g.keys)))

  const sums = (counts: Int32Array): [number, number] => {
    let bonus = 0
    let penalty = 0
    for (let ci = 0; ci < cats.length; ci++) {
      const cat = cats[ci]!
      let catSum = 0
      for (const g of groups[ci]!) {
        let sum = 0
        best.fill(0, 0, g.keys)
        for (let i = g.start; i < g.end; i++) {
          if (counts[i]! <= 0) continue
          const k = exKey[i]!
          const p = points[i]!
          if (k < 0) sum += p
          else if (Math.abs(p) > Math.abs(best[k]!)) best[k] = p
        }
        for (let k = 0; k < g.keys; k++) sum += best[k]!
        catSum += cat.penalty ? Math.max(sum, g.max) : Math.min(sum, g.max)
      }
      if (cat.penalty) penalty += Math.max(catSum, cat.max)
      else bonus += Math.min(catSum, cat.max)
    }
    return [bonus, penalty]
  }

  return {
    size: ids.length,
    indexOf: (id) => pos.get(id),
    idAt: (i) => ids[i]!,
    pointsAt: (i) => points[i]!,
    catAt: (i) => catOf[i]!,
    total(counts) {
      const [bonus, penalty] = sums(counts)
      return Math.max(0, Math.min(bonus, rubric.totalMax) + penalty)
    },
    bonusSum: (counts) => sums(counts)[0],
  }
}

// ---------- Tối ưu toàn cục ----------

export const DEFAULT_NODE_LIMIT = 200_000

export interface Change {
  activityId: string
  from: string | null
  to: string | null
  /** Điểm "làm hết kế hoạch" tăng thêm nếu chỉ áp dụng riêng dòng này lên dữ liệu hiện tại (marginalGain). */
  gain: number
}

export type ScenarioTotals = Record<ScenarioKey, number>

export interface OptimizeResult {
  /** Cách gán mới cho mọi hoạt động tự do: id → chosen. */
  assignment: Record<string, string | null>
  changes: Change[]
  before: ScenarioTotals
  after: ScenarioTotals
  /** `greedy`: vượt giới hạn node, kết quả có thể chưa tối ưu. */
  method: 'exact' | 'greedy'
  nodes: number
}

interface Free {
  activity: Activity
  /** Chỉ số tiêu chí trong FastScorer, -1 = không chọn. Lựa chọn hiện tại đứng đầu. */
  options: number[]
  current: number
  joined: boolean
}

/**
 * Tìm cách gán `chosen` cho các hoạt động tự do, so sánh theo thứ tự: điểm "làm hết kế hoạch",
 * điểm "đã tham gia", rồi ít thay đổi nhất. Branch-and-bound; quá `nodeLimit` thì trả về kết quả tốt nhất
 * đã tìm được (từ leo đồi hoặc từ phần cây đã duyệt) và báo `method: 'greedy'`.
 * Cách gán hiện tại luôn nằm trong không gian tìm kiếm nên kết quả không bao giờ tệ hơn hiện tại.
 */
export function optimize(rubric: Rubric, user: UserData, opts: { nodeLimit?: number } = {}): OptimizeResult {
  const nodeLimit = opts.nodeLimit ?? DEFAULT_NODE_LIMIT
  const scorer = createFastScorer(rubric)
  const excluded = effectiveExcluded(user)
  const penaltyIds = new Set(
    rubric.categories.filter((c) => c.kind === 'penalty').flatMap((c) => c.groups.flatMap((g) => g.criteria.map((k) => k.id))),
  )
  const isPenalty = (id: string | null) => id !== null && penaltyIds.has(id)

  // Hoạt động cố định đóng góp sẵn vào mảng đếm của hai kịch bản.
  const proj = new Int32Array(scorer.size)
  const done = new Int32Array(scorer.size)
  const free: Free[] = []
  for (const a of user.activities) {
    if (a.status === 'rejected') continue
    const cur = a.chosen === null ? -1 : (scorer.indexOf(a.chosen) ?? -1)
    const fixed = a.status === 'confirmed' || a.pinned === true || isPenalty(a.chosen) || a.eligible.some(isPenalty)
    if (fixed) {
      if (cur >= 0) {
        proj[cur]! += 1
        if (a.status === 'joined' || a.status === 'confirmed') done[cur]! += 1
      }
      continue
    }
    const candidates = a.eligible
      .filter((id) => !excluded.has(id))
      .map((id) => scorer.indexOf(id))
      .filter((i): i is number => i !== undefined && i !== cur)
      .sort((x, y) => scorer.pointsAt(y) - scorer.pointsAt(x))
    free.push({ activity: a, options: [...new Set([cur, ...candidates, -1])], current: cur, joined: a.status === 'joined' })
  }

  const add = (f: Free, o: number, d: number) => {
    if (o < 0) return
    proj[o]! += d
    if (f.joined) done[o]! += d
  }
  /** Đặt (d = 1) hoặc gỡ (d = -1) lựa chọn `choice[i]` của các hoạt động `idx` vào mảng đếm. */
  const place = (choice: readonly number[], idx: readonly number[], d: number) => {
    for (const i of idx) add(free[i]!, choice[i]!, d)
  }
  const evaluate = () => [scorer.total(proj), scorer.total(done)] as const
  type Score = { p: number; d: number; changes: number }
  const beats = (a: Score, b: Score) => a.p > b.p || (a.p === b.p && (a.d > b.d || (a.d === b.d && a.changes < b.changes)))
  const all = free.map((_, i) => i)
  const current = free.map((f) => f.current)
  const changesOf = (choice: readonly number[], idx: readonly number[]) => idx.filter((i) => choice[i] !== free[i]!.current).length

  // ---- Lời giải ban đầu bằng leo đồi: vừa là đáp án dự phòng khi vượt giới hạn node, vừa giúp cắt nhánh sớm ----
  /** Gán lần lượt theo thứ tự nhập (nếu `start = null`) hoặc từ cách gán `start`, rồi đổi từng hoạt động cho tới khi hết cải thiện. */
  const localSearch = (start: readonly number[] | null) => {
    const g = start ? [...start] : free.map(() => -1)
    if (start) place(g, all, 1)
    const pick = (i: number) => {
      const f = free[i]!
      let bestO = g[i]!
      let bestS: [number, number] = [-Infinity, -Infinity]
      for (const o of f.options) {
        add(f, o, 1)
        const [p, d] = evaluate()
        add(f, o, -1)
        // hoà thì giữ lựa chọn đang có
        if (p > bestS[0] || (p === bestS[0] && d > bestS[1]) || (p === bestS[0] && d === bestS[1] && o === g[i])) {
          bestO = o
          bestS = [p, d]
        }
      }
      g[i] = bestO
      add(f, bestO, 1)
    }
    if (!start) for (const i of all) pick(i)
    for (let pass = 0, moved = true; moved && pass < 20; pass++) {
      moved = false
      for (const i of all) {
        const before = g[i]!
        add(free[i]!, before, -1)
        pick(i)
        if (g[i] !== before) moved = true
      }
    }
    const [p, d] = evaluate()
    place(g, all, -1)
    return { p, d, changes: changesOf(g, all), choice: g }
  }
  place(current, all, 1)
  const [p0, d0] = evaluate()
  place(current, all, -1)
  let incumbent = { p: p0, d: d0, changes: 0, choice: current }
  for (const cand of [localSearch(null), localSearch(current)]) if (beats(cand, incumbent)) incumbent = cand

  // ---- Tách bài toán ----
  // Nếu bật mọi lựa chọn mà Σ điểm bonus vẫn ≤ totalMax thì trần tổng không bao giờ cắt: các nhóm hoạt động
  // không dùng chung mục lớn nào là độc lập, và tối ưu (theo thứ tự ưu tiên) của tổng = tổng các tối ưu riêng.
  for (const f of free) for (const o of f.options) add(f, o, 1)
  const separable = scorer.bonusSum(proj) <= rubric.totalMax
  for (const f of free) for (const o of f.options) add(f, o, -1)
  let components: number[][] = [all]
  if (separable) {
    const parent = all.slice()
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)))
    const owner = new Map<number, number>() // mục lớn → một hoạt động dùng nó
    for (const i of all) {
      for (const o of free[i]!.options) {
        if (o < 0) continue
        const c = scorer.catAt(o)
        const j = owner.get(c)
        if (j === undefined) owner.set(c, i)
        else parent[find(i)] = find(j)
      }
    }
    const groups = new Map<number, number[]>()
    for (const i of all) groups.set(find(i), [...(groups.get(find(i)) ?? []), i])
    components = [...groups.values()]
  }

  // ---- Branch-and-bound trên từng phần, các phần khác giữ nguyên ----
  let nodes = 0
  let aborted = false
  const choice = [...incumbent.choice]
  place(choice, all, 1)
  for (const comp of components) {
    place(choice, comp, -1)
    const scoreOf = (c: readonly number[]) => {
      place(c, comp, 1)
      const [p, d] = evaluate()
      place(c, comp, -1)
      return { p, d, changes: changesOf(c, comp), choice: comp.map((i) => c[i]!) }
    }
    let local = scoreOf(choice)
    const fromCurrent = scoreOf(current)
    if (beats(fromCurrent, local)) local = fromCurrent

    // Ghi nhớ trạng thái: điểm về sau chỉ phụ thuộc vào tập tiêu chí đang bật (ở hai kịch bản), không phụ thuộc
    // hoạt động nào bật nó. Gặp lại cùng (k, tập bật) với số thay đổi không ít hơn thì bỏ nhánh.
    const touched = [...new Set(comp.flatMap((i) => free[i]!.options.filter((o) => o >= 0)))]
    const seen = new Map<string, number>()
    const stateKey = (k: number) => {
      let key = `${k}:`
      for (const o of touched) key += proj[o]! > 0 ? (done[o]! > 0 ? '2' : '1') : '0'
      return key
    }

    const dfs = (k: number, changes: number) => {
      if (aborted) return
      if (++nodes > nodeLimit) {
        aborted = true
        return
      }
      const key = stateKey(k)
      const prev = seen.get(key)
      if (prev !== undefined && prev <= changes) return
      seen.set(key, changes)
      if (k === comp.length) {
        const [p, d] = evaluate()
        if (beats({ p, d, changes }, local)) local = { p, d, changes, choice: comp.map((i) => choice[i]!) }
        return
      }
      // Chặn trên: bật cùng lúc mọi lựa chọn của các hoạt động còn lại (điểm chỉ tăng khi bật thêm tiêu chí).
      for (let j = k; j < comp.length; j++) for (const o of free[comp[j]!]!.options) add(free[comp[j]!]!, o, 1)
      const [up, ud] = evaluate()
      for (let j = k; j < comp.length; j++) for (const o of free[comp[j]!]!.options) add(free[comp[j]!]!, o, -1)
      if (!beats({ p: up, d: ud, changes }, local)) return

      const i = comp[k]!
      const f = free[i]!
      const saved = choice[i]!
      for (const o of f.options) {
        if (o !== f.current) {
          // Luật trội (điểm chỉ tăng khi bật thêm tiêu chí):
          // - bỏ chọn bị trội bởi giữ lựa chọn hiện tại (điểm không thấp hơn, không tốn thay đổi);
          // - chuyển sang tiêu chí đã bật sẵn không đổi trạng thái mà tốn một thay đổi.
          if (o < 0 && f.current >= 0) continue
          if (o >= 0 && proj[o]! > 0 && (!f.joined || done[o]! > 0)) continue
        }
        choice[i] = o
        add(f, o, 1)
        dfs(k + 1, changes + (o === f.current ? 0 : 1))
        add(f, o, -1)
      }
      choice[i] = saved
    }
    dfs(0, 0)
    comp.forEach((i, k) => (choice[i] = local.choice[k]!))
    place(choice, comp, 1)
  }
  place(choice, all, -1)
  const best = { choice }

  const assignment: Record<string, string | null> = {}
  const changes: Change[] = []
  for (const [i, f] of free.entries()) {
    const to = best.choice[i]! === f.current ? f.activity.chosen : best.choice[i]! < 0 ? null : scorer.idAt(best.choice[i]!)
    assignment[f.activity.id] = to
    if (to !== f.activity.chosen) {
      changes.push({ activityId: f.activity.id, from: f.activity.chosen, to, gain: marginalGain(rubric, user, f.activity, to) })
    }
  }
  return {
    assignment,
    changes,
    before: totals(rubric, user),
    after: totals(rubric, applyChanges(user, changes)),
    method: aborted ? 'greedy' : 'exact',
    nodes,
  }
}

function totals(rubric: Rubric, user: UserData): ScenarioTotals {
  const s = computeScenarios(rubric, user)
  return { confirmed: s.confirmed.capped, done: s.done.capped, projected: s.projected.capped }
}

/** Áp dụng các thay đổi (tất cả hoặc một phần) lên UserData; chọn tiêu chí bị loại trừ thì tự bỏ loại trừ. */
export function applyChanges(user: UserData, changes: readonly Change[]): UserData {
  return changes.reduce((d, c) => patchActivity(d, c.activityId, { chosen: c.to }), user)
}

// ---------- Nhóm còn trống ----------

export interface OpenGroup {
  groupId: string
  categoryId: string
  /** Số điểm còn lấy được thật, tính cả trần nhóm, trần mục và totalMax. */
  room: number
  /** Tiêu chí còn trống (chưa ai chọn, không bị loại trừ), điểm tăng dần. */
  criteria: { id: string; name: string; points: number }[]
}

/** Các nhóm còn nhiều điểm trống nhất theo kịch bản "làm hết kế hoạch" (SPEC mục 6, gợi ý thêm). */
export function openGroups(rubric: Rubric, user: UserData): OpenGroup[] {
  const tree = computeScenarios(rubric, user).projected
  const excluded = effectiveExcluded(user)
  const used = new Set(user.activities.filter((a) => a.status !== 'rejected').map((a) => a.chosen))
  const totalRoom = rubric.totalMax - Math.min(tree.bonus, rubric.totalMax)
  const out: OpenGroup[] = []
  rubric.categories.forEach((cat, ci) => {
    if (cat.kind === 'penalty') return
    const catScore = tree.categories[ci]!
    cat.groups.forEach((g, gi) => {
      const room = Math.min(g.max - catScore.groups[gi]!.capped, cat.max - catScore.capped, totalRoom)
      const criteria = g.criteria
        .filter((c) => !used.has(c.id) && !excluded.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, points: c.points }))
        .sort((a, b) => a.points - b.points)
      if (room > 0 && criteria.length > 0) out.push({ groupId: g.id, categoryId: cat.id, room, criteria })
    })
  })
  return out.sort((a, b) => b.room - a.room)
}

export interface OpenCategory {
  categoryId: string
  /** Điểm còn lấy được của cả mục (trần mục và totalMax); các nhóm bên trong dùng chung phần này. */
  room: number
  /** Nhóm còn trống, xếp theo `room` giảm dần; tiêu chí trong mỗi nhóm xếp điểm cao xuống. */
  groups: OpenGroup[]
}

/**
 * `openGroups` gom theo mục lớn, vì các nhóm cùng mục dùng chung phần còn lại của mục nên không cộng dồn được.
 * Mục xếp theo điểm còn lấy được giảm dần (hoà thì theo thứ tự rubric).
 */
export function openCategories(rubric: Rubric, user: UserData): OpenCategory[] {
  const tree = computeScenarios(rubric, user).projected
  const totalRoom = rubric.totalMax - Math.min(tree.bonus, rubric.totalMax)
  const groups = openGroups(rubric, user)
  return rubric.categories
    .map((cat, ci) => ({
      categoryId: cat.id,
      room: Math.min(cat.max - tree.categories[ci]!.capped, totalRoom),
      groups: groups
        .filter((g) => g.categoryId === cat.id)
        .map((g) => ({ ...g, criteria: [...g.criteria].sort((a, b) => b.points - a.points) })),
    }))
    .filter((c) => c.groups.length > 0)
    .sort((a, b) => b.room - a.room)
}
