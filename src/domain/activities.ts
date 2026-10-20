// Thao tác thuần trên danh sách hoạt động; UI dùng chúng làm `recipe` cho reducer.

import type { Activity, UserData } from './types.ts'

/** Bỏ dấu tiếng Việt + chữ thường, dùng để tìm kiếm không phân biệt dấu: "Đội Tình nguyện" → "doi tinh nguyen". */
export function foldVietnamese(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
}

/** "Tham gia AI Thực chiến 2026" → "tham-gia-ai-thuc-chien-2026" (khớp pattern `^[a-z0-9-]+$` của schema). */
export function slugify(name: string): string {
  const slug = foldVietnamese(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'hoat-dong'
}

/** Id mới từ tên, thêm hậu tố -2, -3… nếu trùng. */
export function uniqueActivityId(name: string, user: UserData): string {
  const taken = new Set(user.activities.map((a) => a.id))
  const base = slugify(name)
  let id = base
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`
  return id
}

/**
 * Thêm hoặc thay hoạt động (theo id). Nếu hoạt động không bị rejected chọn một tiêu chí đang bị loại trừ
 * thì bỏ tiêu chí đó khỏi `excludedCriteria` trong cùng thao tác (SPEC mục 5).
 */
export function upsertActivity(user: UserData, activity: Activity): UserData {
  const exists = user.activities.some((a) => a.id === activity.id)
  const activities = exists ? user.activities.map((a) => (a.id === activity.id ? activity : a)) : [...user.activities, activity]
  const excluded = user.excludedCriteria ?? []
  const unexclude = activity.status !== 'rejected' && activity.chosen !== null && excluded.includes(activity.chosen)
  return {
    ...user,
    activities,
    ...(unexclude && { excludedCriteria: excluded.filter((id) => id !== activity.chosen) }),
  }
}

/** Sửa một phần hoạt động theo id; không có thay đổi thì trả về đúng object cũ (không tạo bước undo). */
export function patchActivity(user: UserData, id: string, patch: Partial<Omit<Activity, 'id'>>): UserData {
  const current = user.activities.find((a) => a.id === id)
  if (!current) return user
  const next: Activity = { ...current, ...patch }
  for (const k of Object.keys(next) as (keyof Activity)[]) if (next[k] === undefined || next[k] === '') delete next[k]
  const changed = (Object.keys({ ...current, ...next }) as (keyof Activity)[]).some(
    (k) => JSON.stringify(current[k]) !== JSON.stringify(next[k]),
  )
  return changed ? upsertActivity(user, next) : user
}

export function removeActivity(user: UserData, id: string): UserData {
  return { ...user, activities: user.activities.filter((a) => a.id !== id) }
}
