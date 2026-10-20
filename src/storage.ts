// Mọi truy cập lưu trữ (localStorage, file JSON tải xuống/tải lên) đi qua module này. SPEC mục 8.

import { rubricForSemester } from './domain/rubric.ts'
import { parseJsonText, validateUserDataJson, type ParseResult } from './domain/schema.ts'
import type { Activity, Semester, UserData } from './domain/types.ts'

// ---------- Serialize ----------

const ACTIVITY_KEYS = ['id', 'name', 'status', 'eligible', 'chosen', 'pinned', 'date', 'link', 'note'] as const

/** Chuẩn hoá: thứ tự khoá cố định theo schema, bỏ trường `undefined`, luôn có `excludedCriteria`. */
export function normalizeUserData(user: UserData): UserData {
  const activities = user.activities.map((a) => {
    const out: Record<string, unknown> = {}
    for (const k of ACTIVITY_KEYS) if (a[k] !== undefined) out[k] = a[k]
    return out as unknown as Activity
  })
  return {
    ...(user.$schema !== undefined && { $schema: user.$schema }),
    schemaVersion: 1,
    semester: user.semester,
    rubric: user.rubric,
    excludedCriteria: user.excludedCriteria ?? [],
    activities,
  }
}

/** Nội dung file tải xuống: JSON thụt 2 space, kết thúc bằng xuống dòng. Cùng dữ liệu → cùng chuỗi. */
export function serializeUserData(user: UserData): string {
  return JSON.stringify(normalizeUserData(user), null, 2) + '\n'
}

/** Parse + validate nội dung file tải lên. Lỗi là danh sách thông báo tiếng Việt có vị trí. */
export function parseUserDataFile(text: string): ParseResult<UserData> {
  const json = parseJsonText(text)
  if (!json.ok) return json
  const res = validateUserDataJson(json.value)
  return res.ok ? { ok: true, value: normalizeUserData(res.value) } : res
}

/** Có thay đổi chưa tải xuống so với lần tải xuống/tải lên gần nhất (`savedSnapshot`). */
export function isDirty(user: UserData, savedSnapshot: string | null): boolean {
  return savedSnapshot === null || serializeUserData(user) !== savedSnapshot
}

/** `drl-<semester>-<YYYYMMDD-HHmm>.json`, giờ địa phương. */
export function downloadFileName(semester: Semester, now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`
  return `drl-${semester}-${stamp}.json`
}

/** Kích hoạt tải file JSON trong trình duyệt. Trả về snapshot đã tải để đánh dấu "đã lưu". */
export function downloadUserData(user: UserData): string {
  const text = serializeUserData(user)
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = downloadFileName(user.semester)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return text
}

export function createEmptyUserData(semester: Semester): UserData {
  return {
    schemaVersion: 1,
    semester,
    rubric: rubricForSemester(semester).id,
    excludedCriteria: [],
    activities: [],
  }
}

/** Đoán học kỳ đang diễn ra để điền sẵn khi tạo mới (kỳ 1 từ tháng 9, kỳ 2 từ tháng 2, kỳ hè tháng 7–8). */
export function guessSemester(now: Date = new Date()): Semester {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (m >= 9) return `${y}.1`
  if (m === 1) return `${y - 1}.1`
  if (m <= 6) return `${y - 1}.2`
  return `${y - 1}.3`
}

// ---------- Bản nháp localStorage ----------

export interface Draft {
  data: UserData
  /** Chuỗi serialize ở lần tải xuống/tải lên gần nhất; `null` nếu chưa bao giờ. */
  savedSnapshot: string | null
  updatedAt: string
}

const PREFIX = 'drl:v1:'
const DRAFT_PREFIX = `${PREFIX}draft:`
const LAST_KEY = `${PREFIX}last`

export interface DraftStore {
  /** `false` nếu trình duyệt chặn localStorage: app chạy trong bộ nhớ. */
  readonly available: boolean
  load(semester: Semester): Draft | null
  /** Trả về `false` nếu ghi thất bại (bị chặn, đầy bộ nhớ…). */
  save(draft: Draft): boolean
  semesters(): Semester[]
  /** Bản nháp của học kỳ mở gần nhất. */
  loadLatest(): Draft | null
}

/** Mọi lệnh đọc/ghi đều bọc try/catch; `storage = null` nghĩa là không có localStorage. */
export function createDraftStore(storage: Storage | null): DraftStore {
  const get = (key: string): string | null => {
    try {
      return storage?.getItem(key) ?? null
    } catch {
      return null
    }
  }
  const set = (key: string, value: string): boolean => {
    try {
      if (!storage) return false
      storage.setItem(key, value)
      return true
    } catch {
      return false
    }
  }

  const load = (semester: Semester): Draft | null => {
    const raw = get(DRAFT_PREFIX + semester)
    if (raw === null) return null
    try {
      const parsed = JSON.parse(raw) as Partial<Draft>
      const res = validateUserDataJson(parsed.data)
      if (!res.ok || res.value.semester !== semester) return null
      return {
        data: normalizeUserData(res.value),
        savedSnapshot: typeof parsed.savedSnapshot === 'string' ? parsed.savedSnapshot : null,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      }
    } catch {
      return null // bản nháp hỏng: bỏ qua, không làm sập app
    }
  }

  return {
    available: storage !== null,
    load,
    save(draft) {
      const ok = set(DRAFT_PREFIX + draft.data.semester, JSON.stringify(draft))
      return set(LAST_KEY, draft.data.semester) && ok
    },
    semesters() {
      const out: Semester[] = []
      try {
        if (!storage) return out
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key?.startsWith(DRAFT_PREFIX)) out.push(key.slice(DRAFT_PREFIX.length))
        }
      } catch {
        // bị chặn giữa chừng: trả về những gì đã đọc được
      }
      return out.sort()
    },
    loadLatest() {
      const last = get(LAST_KEY)
      return last === null ? null : load(last)
    },
  }
}

/** localStorage nếu dùng được (thử ghi/xoá một khoá), không thì `null`. */
export function browserStorage(): Storage | null {
  try {
    const s = window.localStorage
    const probe = `${PREFIX}probe`
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}
