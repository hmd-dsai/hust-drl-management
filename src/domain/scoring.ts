// Tính điểm theo SPEC mục 4. Hàm thuần, không lưu gì: mọi con số đều tính lại từ UserData.

import { rubricIndex } from './rubric.ts'
import type { CategoryKind, Criterion, Rubric, Status, UserData } from './types.ts'

/** Thông tin chung của mọi node. `wasted = raw − capped` (điểm bị trần cắt mất). */
export interface ScoreNode {
  id: string
  /** Điểm trước khi kẹp trần của chính node này. */
  raw: number
  /** Điểm thật sau khi kẹp. */
  capped: number
  max: number
  wasted: number
}

export interface CriterionScore extends ScoreNode {
  /** Có hoạt động thuộc kịch bản đang chọn tiêu chí này. */
  active: boolean
  /** Id các hoạt động thuộc kịch bản đang chọn tiêu chí này, theo thứ tự trong UserData. */
  activityIds: string[]
}

export interface GroupScore extends ScoreNode {
  criteria: CriterionScore[]
}

export interface CategoryScore extends ScoreNode {
  kind: CategoryKind
  groups: GroupScore[]
}

/** Node gốc: `capped` là tổng điểm cuối cùng, `max` là `totalMax`. */
export interface ScoreTree extends ScoreNode {
  rubricId: string
  categories: CategoryScore[]
  /** Σ điểm các mục bonus (đã kẹp theo mục, chưa kẹp totalMax). */
  bonus: number
  /** Σ điểm các mục penalty (≤ 0). */
  penalty: number
}

function node(id: string, raw: number, max: number, kind: CategoryKind): ScoreNode {
  const capped = kind === 'penalty' ? Math.max(raw, max) : Math.min(raw, max)
  return { id, raw, capped, max, wasted: raw - capped }
}

export function computeScore(rubric: Rubric, user: UserData, statuses: ReadonlySet<Status>): ScoreTree {
  const index = rubricIndex(rubric)
  const chosenBy = new Map<string, string[]>()
  for (const a of user.activities) {
    if (a.chosen === null || !statuses.has(a.status)) continue
    if (index.get(a.chosen)?.kind !== 'criterion') continue // id lạ: validate sẽ cảnh báo
    const ids = chosenBy.get(a.chosen) ?? []
    ids.push(a.id)
    chosenBy.set(a.chosen, ids)
  }

  const categories = rubric.categories.map((cat): CategoryScore => {
    const kind = cat.kind ?? 'bonus'
    const groups = cat.groups.map((group): GroupScore => {
      // Mỗi exclusiveGroup chỉ giữ tiêu chí được kích hoạt có |points| lớn nhất (gặp trước thắng khi hoà).
      const winners = new Map<string, Criterion>()
      for (const c of group.criteria) {
        if (c.exclusiveGroup === undefined || !chosenBy.has(c.id)) continue
        const best = winners.get(c.exclusiveGroup)
        if (!best || Math.abs(c.points) > Math.abs(best.points)) winners.set(c.exclusiveGroup, c)
      }
      const criteria = group.criteria.map((c): CriterionScore => {
        const activityIds = chosenBy.get(c.id) ?? []
        const active = activityIds.length > 0
        const raw = active ? c.points : 0
        const counted = active && (c.exclusiveGroup === undefined || winners.get(c.exclusiveGroup) === c)
        const capped = counted ? c.points : 0
        return { id: c.id, raw, capped, max: c.points, wasted: raw - capped, active, activityIds }
      })
      const sum = criteria.reduce((s, c) => s + c.capped, 0)
      return { ...node(group.id, sum, group.max, kind), criteria }
    })
    const sum = groups.reduce((s, g) => s + g.capped, 0)
    return { ...node(cat.id, sum, cat.max, kind), kind, groups }
  })

  const bonus = categories.filter((c) => c.kind === 'bonus').reduce((s, c) => s + c.capped, 0)
  const penalty = categories.filter((c) => c.kind === 'penalty').reduce((s, c) => s + c.capped, 0)
  const raw = bonus + penalty
  const capped = Math.max(0, Math.min(bonus, rubric.totalMax) + penalty)
  return { id: 'total', raw, capped, max: rubric.totalMax, wasted: raw - capped, rubricId: rubric.id, categories, bonus, penalty }
}

// ---------- Ba kịch bản ----------

export type ScenarioKey = 'confirmed' | 'done' | 'projected'

export const SCENARIO_KEYS: readonly ScenarioKey[] = ['confirmed', 'done', 'projected']

export const SCENARIOS: Record<ScenarioKey, { label: string; statuses: ReadonlySet<Status> }> = {
  confirmed: { label: 'Hiện tại', statuses: new Set(['confirmed']) },
  done: { label: 'Nếu đã tham gia được tính', statuses: new Set(['confirmed', 'joined']) },
  projected: { label: 'Nếu làm hết kế hoạch', statuses: new Set(['confirmed', 'joined', 'planned']) },
}

export type ScenarioScores = Record<ScenarioKey, ScoreTree>

export function computeScenarios(rubric: Rubric, user: UserData): ScenarioScores {
  return {
    confirmed: computeScore(rubric, user, SCENARIOS.confirmed.statuses),
    done: computeScore(rubric, user, SCENARIOS.done.statuses),
    projected: computeScore(rubric, user, SCENARIOS.projected.statuses),
  }
}

/** Điểm sau kẹp của mọi mục, nhóm và `total`, dạng `{ "II.3": 6, "II": 18, total: 60 }`. */
export function flattenScore(tree: ScoreTree): Record<string, number> {
  const out: Record<string, number> = {}
  for (const cat of tree.categories) {
    for (const g of cat.groups) out[g.id] = g.capped
    out[cat.id] = cat.capped
  }
  out.total = tree.capped
  return out
}

// ---------- excludedCriteria ----------

/**
 * "Loại trừ hiệu lực" (SPEC mục 5): `excludedCriteria` trừ các tiêu chí đang được
 * một hoạt động không bị rejected chọn — lựa chọn thực tế thắng phán đoán chủ quan.
 */
export function effectiveExcluded(user: UserData): Set<string> {
  const used = new Set(user.activities.filter((a) => a.status !== 'rejected').map((a) => a.chosen))
  return new Set((user.excludedCriteria ?? []).filter((id) => !used.has(id)))
}
