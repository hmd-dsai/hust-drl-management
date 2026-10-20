// Kiểm tra hợp lệ theo SPEC mục 5. Chỉ trả về thông báo, không bao giờ chặn người dùng.

import { rubricIndex } from './rubric.ts'
import { effectiveExcluded } from './scoring.ts'
import type { Activity, Rubric, Status, UserData } from './types.ts'

export type Severity = 'warning' | 'info'

export type IssueCode =
  | 'unknown-rubric'
  | 'unknown-criterion'
  | 'chosen-not-eligible'
  | 'missing-chosen'
  | 'excluded-overridden'
  | 'duplicate-chosen'
  | 'exclusive-conflict'

export interface Issue {
  severity: Severity
  code: IssueCode
  message: string
  /** Hoạt động mà thông báo nên hiện trên dòng của nó. */
  activityId?: string
  criterionIds?: string[]
  /** Với `duplicate-chosen`: các tiêu chí eligible còn trống có thể chuyển sang. */
  suggestions?: string[]
}

/** Thứ tự ưu tiên khi nhiều hoạt động chọn trùng: hoạt động "tốt" nhất được giữ, các hoạt động sau là thừa. */
const STATUS_RANK: Record<Status, number> = { confirmed: 0, joined: 1, planned: 2, rejected: 3 }

export function validate(rubric: Rubric, user: UserData): Issue[] {
  const index = rubricIndex(rubric)
  const isCriterion = (id: string) => index.get(id)?.kind === 'criterion'
  const issues: Issue[] = []
  const label = (a: Activity) => `"${a.name}"`

  if (user.rubric !== rubric.id) {
    issues.push({
      severity: 'warning',
      code: 'unknown-rubric',
      message: `File ghi rubric "${user.rubric}" nhưng app đang dùng rubric ${rubric.id} (theo học kỳ ${user.semester}).`,
    })
  }

  // ---- warning theo từng hoạt động ----
  for (const a of user.activities) {
    const unknown = [...new Set([...a.eligible, ...(a.chosen === null ? [] : [a.chosen])])].filter((id) => !isCriterion(id))
    if (unknown.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'unknown-criterion',
        message: `${label(a)} trỏ tới tiêu chí không có trong rubric ${rubric.id}: ${unknown.join(', ')}.`,
        activityId: a.id,
        criterionIds: unknown,
      })
    }
    if (a.chosen !== null && isCriterion(a.chosen) && !a.eligible.includes(a.chosen)) {
      issues.push({
        severity: 'warning',
        code: 'chosen-not-eligible',
        message: `${label(a)} chọn ${a.chosen} nhưng tiêu chí này không nằm trong danh sách có thể dùng.`,
        activityId: a.id,
        criterionIds: [a.chosen],
      })
    }
    if (a.chosen === null && (a.status === 'joined' || a.status === 'confirmed')) {
      issues.push({
        severity: 'warning',
        code: 'missing-chosen',
        message: `${label(a)} đã ${a.status === 'confirmed' ? 'được xác nhận' : 'tham gia'} nhưng chưa chọn tiêu chí nên chưa được tính điểm.`,
        activityId: a.id,
      })
    }
  }

  // ---- info ----
  // Chỉ hoạt động không bị rejected mới thực sự "dùng" tiêu chí.
  const users = new Map<string, Activity[]>()
  for (const a of user.activities) {
    if (a.status === 'rejected' || a.chosen === null || !isCriterion(a.chosen)) continue
    users.set(a.chosen, [...(users.get(a.chosen) ?? []), a])
  }

  const excluded = new Set(user.excludedCriteria ?? [])
  for (const [criterionId, acts] of users) {
    if (!excluded.has(criterionId)) continue
    issues.push({
      severity: 'info',
      code: 'excluded-overridden',
      message: `${criterionId} nằm trong danh sách loại trừ nhưng đang được ${acts.map(label).join(', ')} chọn, nên được coi là không bị loại trừ.`,
      activityId: acts[0]!.id,
      criterionIds: [criterionId],
    })
  }

  const stillExcluded = effectiveExcluded(user)
  for (const [criterionId, acts] of users) {
    if (acts.length < 2) continue
    const [kept, ...extra] = [...acts].sort((x, y) => STATUS_RANK[x.status] - STATUS_RANK[y.status])
    for (const a of extra) {
      const suggestions = a.eligible.filter((id) => isCriterion(id) && !users.has(id) && !stillExcluded.has(id))
      const hint = suggestions.length > 0 ? ` Có thể chuyển sang: ${suggestions.join(', ')}.` : ''
      issues.push({
        severity: 'info',
        code: 'duplicate-chosen',
        message: `${label(a)} chọn trùng ${criterionId} với ${label(kept!)} nên không được cộng thêm điểm.${hint}`,
        activityId: a.id,
        criterionIds: [criterionId],
        suggestions,
      })
    }
  }

  for (const cat of rubric.categories) {
    for (const group of cat.groups) {
      const byKey = new Map<string, string[]>()
      for (const c of group.criteria) {
        if (c.exclusiveGroup === undefined || !users.has(c.id)) continue
        byKey.set(c.exclusiveGroup, [...(byKey.get(c.exclusiveGroup) ?? []), c.id])
      }
      for (const ids of byKey.values()) {
        if (ids.length < 2) continue
        issues.push({
          severity: 'info',
          code: 'exclusive-conflict',
          message: `${ids.join(', ')} là các mức loại trừ nhau trong nhóm ${group.id}, chỉ mức cao nhất được tính.`,
          criterionIds: ids,
        })
      }
    }
  }

  return issues
}
