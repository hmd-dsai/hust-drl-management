// Nạp rubric từ data/rubrics/, validate, chọn rubric theo học kỳ, và index id → node.

import { validateRubricJson, type ParseResult } from './schema.ts'
import type { Category, Criterion, Group, Rubric, Semester } from './types.ts'

export type RubricNode =
  | { kind: 'category'; node: Category; parentId: null }
  | { kind: 'group'; node: Group; parentId: string }
  | { kind: 'criterion'; node: Criterion; parentId: string }

export type RubricIndex = ReadonlyMap<string, RubricNode>

// ---------- Học kỳ ----------

const SEMESTER_RE = /^(\d{4})\.([1-3])$/

export function isSemester(s: string): boolean {
  return SEMESTER_RE.test(s)
}

/** So sánh hai học kỳ hợp lệ: âm nếu a < b, 0 nếu bằng, dương nếu a > b. */
export function compareSemester(a: Semester, b: Semester): number {
  const [, ya, ka] = SEMESTER_RE.exec(a) ?? []
  const [, yb, kb] = SEMESTER_RE.exec(b) ?? []
  if (ya === undefined || yb === undefined) throw new Error(`Học kỳ không hợp lệ: ${a} / ${b}`)
  return Number(ya) - Number(yb) || Number(ka) - Number(kb)
}

// ---------- Kiểm tra cấu trúc + index ----------

/** Validate schema rồi kiểm tra id duy nhất và id con nối tiếp id cha. */
export function parseRubric(data: unknown): ParseResult<Rubric> {
  const res = validateRubricJson(data)
  if (!res.ok) return res
  const errors = checkStructure(res.value)
  return errors.length > 0 ? { ok: false, errors } : res
}

function checkStructure(rubric: Rubric): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const checkId = (id: string, at: string, expected: RegExp | null, shape: string) => {
    if (seen.has(id)) errors.push(`${at}: mã "${id}" bị trùng`)
    seen.add(id)
    if (expected && !expected.test(id)) errors.push(`${at}: mã "${id}" không khớp mã cha, cần dạng ${shape}`)
  }
  rubric.categories.forEach((cat, ci) => {
    const catAt = `categories[${ci}]`
    checkId(cat.id, `${catAt}.id`, /^[A-Z]+$/, 'chữ in hoa (ví dụ II)')
    cat.groups.forEach((group, gi) => {
      const groupAt = `${catAt}.groups[${gi}]`
      checkId(group.id, `${groupAt}.id`, new RegExp(`^${cat.id}\\.\\d+$`), `${cat.id}.<số>`)
      group.criteria.forEach((crit, ki) => {
        const critAt = `${groupAt}.criteria[${ki}]`
        checkId(crit.id, `${critAt}.id`, new RegExp(`^${escapeRe(group.id)}\\.[a-z]+$`), `${group.id}.<chữ>`)
      })
    })
  })
  if (!isSemester(rubric.id)) errors.push(`id: "${rubric.id}" không phải học kỳ hợp lệ`)
  return errors
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const indexCache = new WeakMap<Rubric, RubricIndex>()

/** Index id → node kèm id cha. Rubric phải đã qua parseRubric. */
export function rubricIndex(rubric: Rubric): RubricIndex {
  const cached = indexCache.get(rubric)
  if (cached) return cached
  const index = new Map<string, RubricNode>()
  for (const cat of rubric.categories) {
    index.set(cat.id, { kind: 'category', node: cat, parentId: null })
    for (const group of cat.groups) {
      index.set(group.id, { kind: 'group', node: group, parentId: cat.id })
      for (const crit of group.criteria) {
        index.set(crit.id, { kind: 'criterion', node: crit, parentId: group.id })
      }
    }
  }
  indexCache.set(rubric, index)
  return index
}

// ---------- Nạp rubric đóng gói sẵn ----------

/**
 * Validate các file rubric (đường dẫn → nội dung JSON), sắp theo id tăng dần.
 * Rubric là dữ liệu build sẵn nên lỗi thì throw luôn.
 */
export function loadRubrics(files: Record<string, unknown>): Rubric[] {
  const errors: string[] = []
  const list: Rubric[] = []
  for (const [path, data] of Object.entries(files)) {
    const res = parseRubric(data)
    if (!res.ok) {
      errors.push(...res.errors.map((e) => `${path}: ${e}`))
      continue
    }
    const fileId = path.split('/').pop()?.replace(/\.json$/, '')
    if (fileId !== res.value.id) errors.push(`${path}: id "${res.value.id}" không trùng tên file`)
    list.push(res.value)
  }
  if (list.length === 0) errors.push('Không có rubric nào trong data/rubrics/')
  if (errors.length > 0) throw new Error(`Rubric không hợp lệ:\n${errors.join('\n')}`)
  return list.sort((a, b) => compareSemester(a.id, b.id))
}

export const rubrics: readonly Rubric[] = loadRubrics(
  import.meta.glob('../../data/rubrics/*.json', { eager: true, import: 'default' }),
)

export function getRubric(id: string): Rubric | undefined {
  return rubrics.find((r) => r.id === id)
}

/**
 * Rubric cho một học kỳ: rubric có id lớn nhất mà ≤ học kỳ; học kỳ cũ hơn mọi rubric
 * thì dùng rubric cũ nhất; học kỳ không hợp lệ thì dùng rubric mới nhất (SPEC mục 3).
 */
export function rubricForSemester(semester: Semester, list: readonly Rubric[] = rubrics): Rubric {
  const oldest = list[0]
  const latest = list[list.length - 1]
  if (!oldest || !latest) throw new Error('Danh sách rubric rỗng')
  if (!isSemester(semester)) return latest
  let found = oldest
  for (const r of list) if (compareSemester(r.id, semester) <= 0) found = r
  return found
}
