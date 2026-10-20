// Gợi ý gán tiêu chí (SPEC mục 6). Giai đoạn 5 mới có marginalGain; bộ tối ưu toàn cục làm ở giai đoạn 6.

import { rubricIndex } from './rubric.ts'
import { computeScore, SCENARIOS } from './scoring.ts'
import type { Activity, Rubric, UserData } from './types.ts'

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
