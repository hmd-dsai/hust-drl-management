// Kiểu TS khớp 1-1 với schema/rubric.schema.json và schema/userdata.schema.json.
// Sửa schema thì phải sửa ở đây (test trong schema.test.ts sẽ bắt lệch cơ bản).

/** Mã học kỳ dạng `YYYY.k`, k ∈ {1,2,3}, ví dụ `2026.1`. */
export type Semester = string

// ---------- Rubric ----------

export type CategoryKind = 'bonus' | 'penalty'

export interface Criterion {
  id: string
  name: string
  points: number
  /** Các tiêu chí cùng khoá trong một nhóm là các mức loại trừ nhau. */
  exclusiveGroup?: string
  note?: string
}

export interface Group {
  id: string
  name: string
  max: number
  criteria: Criterion[]
}

export interface Category {
  id: string
  name: string
  /** Mặc định `bonus`. */
  kind?: CategoryKind
  /** `bonus`: trần trên. `penalty`: trần dưới (số âm). */
  max: number
  groups: Group[]
}

export interface Rubric {
  $schema?: string
  schemaVersion: 1
  /** Học kỳ đầu tiên áp dụng rubric, trùng tên file. */
  id: Semester
  name: string
  totalMax: number
  source?: string
  categories: Category[]
}

// ---------- UserData ----------

export type Status = 'planned' | 'joined' | 'confirmed' | 'rejected'

export const STATUSES: readonly Status[] = ['planned', 'joined', 'confirmed', 'rejected']

export interface Activity {
  id: string
  name: string
  status: Status
  eligible: string[]
  chosen: string | null
  pinned?: boolean
  /** Ngày dạng `YYYY-MM-DD`. */
  date?: string
  link?: string
  note?: string
}

export interface UserData {
  $schema?: string
  schemaVersion: 1
  semester: Semester
  rubric: string
  excludedCriteria?: string[]
  activities: Activity[]
}
