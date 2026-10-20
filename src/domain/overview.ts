// Dữ liệu dẫn xuất cho màn hình "Trạng thái ĐRL" (SPEC mục 7.2). Hàm thuần.

import { effectiveExcluded, SCENARIO_KEYS, type ScenarioKey, type ScenarioScores, type ScoreNode } from './scoring.ts'
import type { Activity, Rubric, Status, UserData } from './types.ts'

export interface CriterionInfo {
  /** Hoạt động không bị rejected đang chọn tiêu chí này. */
  chosenBy: Activity[]
  /** Trạng thái tốt nhất trong `chosenBy` (confirmed > joined > planned), `null` nếu chưa ai chọn. */
  best: Status | null
  /** Mọi hoạt động có tiêu chí này trong `eligible` (kể cả rejected). */
  eligible: Activity[]
  /** Hoạt động không bị rejected có thể dùng tiêu chí này nhưng đang gán chỗ khác hoặc chưa gán. */
  elsewhere: Activity[]
  /** Nằm trong "loại trừ hiệu lực" (SPEC mục 5). */
  excluded: boolean
  /** Có trong `excludedCriteria` nhưng bị lựa chọn thực tế ghi đè. */
  excludedOverridden: boolean
}

const RANK: Record<Status, number> = { confirmed: 0, joined: 1, planned: 2, rejected: 3 }

export function criterionInfo(rubric: Rubric, user: UserData): Map<string, CriterionInfo> {
  const excluded = effectiveExcluded(user)
  const listed = new Set(user.excludedCriteria ?? [])
  const out = new Map<string, CriterionInfo>()
  for (const cat of rubric.categories) {
    for (const group of cat.groups) {
      for (const c of group.criteria) {
        const eligible = user.activities.filter((a) => a.eligible.includes(c.id))
        const chosenBy = user.activities.filter((a) => a.chosen === c.id && a.status !== 'rejected')
        const best = chosenBy.reduce<Status | null>((b, a) => (b === null || RANK[a.status] < RANK[b] ? a.status : b), null)
        out.set(c.id, {
          chosenBy,
          best,
          eligible,
          elsewhere: eligible.filter((a) => a.status !== 'rejected' && a.chosen !== c.id),
          excluded: excluded.has(c.id),
          excludedOverridden: listed.has(c.id) && !excluded.has(c.id),
        })
      }
    }
  }
  return out
}

/** Điểm của mọi node theo từng kịch bản: `nodes.done.get("II.2")`. */
export function scoreNodes(scores: ScenarioScores): Record<ScenarioKey, Map<string, ScoreNode>> {
  const build = (key: ScenarioKey) => {
    const m = new Map<string, ScoreNode>()
    const tree = scores[key]
    m.set(tree.id, tree)
    for (const cat of tree.categories) {
      m.set(cat.id, cat)
      for (const g of cat.groups) {
        m.set(g.id, g)
        for (const c of g.criteria) m.set(c.id, c)
      }
    }
    return m
  }
  return { confirmed: build('confirmed'), done: build('done'), projected: build('projected') }
}

/** Kịch bản sớm nhất mà node (mục hoặc nhóm bonus) chạm trần; `null` nếu chưa đầy ở kịch bản nào. */
export function fullAt(nodes: Record<ScenarioKey, Map<string, ScoreNode>>, id: string): ScenarioKey | null {
  return SCENARIO_KEYS.find((k) => {
    const n = nodes[k].get(id)
    return n !== undefined && n.max > 0 && n.capped >= n.max
  }) ?? null
}
