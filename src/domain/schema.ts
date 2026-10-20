// Validate JSON theo schema/*.schema.json bằng Ajv (draft 2020-12),
// và chuyển lỗi Ajv thành thông báo tiếng Việt có vị trí dạng `activities[3].status`.

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import rubricSchema from '../../schema/rubric.schema.json'
import userDataSchema from '../../schema/userdata.schema.json'
import type { Rubric, UserData } from './types.ts'

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

const ajv = new Ajv2020({ allErrors: true, verbose: true })
addFormats(ajv)

const validateRubricSchema = ajv.compile<Rubric>(rubricSchema)
const validateUserDataSchema = ajv.compile<UserData>(userDataSchema)

export function validateRubricJson(data: unknown): ParseResult<Rubric> {
  return run(validateRubricSchema, data)
}

export function validateUserDataJson(data: unknown): ParseResult<UserData> {
  return run(validateUserDataSchema, data)
}

/** Parse chuỗi JSON (ví dụ nội dung file tải lên), báo lỗi cú pháp bằng tiếng Việt, kèm dòng/cột nếu biết. */
export function parseJsonText(text: string): ParseResult<unknown> {
  if (text.trim() === '') return { ok: false, errors: ['File rỗng, không có nội dung JSON.'] }
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (e) {
    return { ok: false, errors: [`File không phải JSON hợp lệ: ${describeSyntaxError(text, e instanceof Error ? e.message : String(e))}`] }
  }
}

const SYNTAX_HINT = 'Kiểm tra dấu phẩy, dấu ngoặc và dấu nháy kép quanh tên trường.'

/** Thông báo của JSON.parse khác nhau giữa các trình duyệt; lấy dòng/cột nếu có, còn lại dùng câu chung. */
function describeSyntaxError(text: string, message: string): string {
  const lc = /line (\d+) column (\d+)/.exec(message)
  if (lc) return `lỗi cú pháp ở dòng ${lc[1]}, cột ${lc[2]}. ${SYNTAX_HINT}`
  const pos = /position (\d+)/.exec(message)
  if (pos) {
    const before = text.slice(0, Number(pos[1])).split('\n')
    return `lỗi cú pháp ở dòng ${before.length}, cột ${before[before.length - 1]!.length + 1}. ${SYNTAX_HINT}`
  }
  if (/end of (JSON|data)|unexpected end/i.test(message)) return 'file bị cắt ngang, thiếu dấu đóng } hoặc ].'
  const token = /Unexpected token '(.+?)'/.exec(message)
  if (token) return `có ký tự không mong đợi "${token[1]}". ${SYNTAX_HINT}`
  return `lỗi cú pháp. ${SYNTAX_HINT}`
}

function run<T>(validate: ValidateFunction<T>, data: unknown): ParseResult<T> {
  if (validate(data)) return { ok: true, value: data }
  return { ok: false, errors: (validate.errors ?? []).map(formatError) }
}

// ---------- Định dạng lỗi ----------

/** `/activities/3/status` → `activities[3].status`; gốc → `(gốc)`. */
export function formatPath(instancePath: string, extra?: string): string {
  const parts = instancePath.split('/').slice(1)
  if (extra !== undefined) parts.push(extra)
  let out = ''
  for (const raw of parts) {
    const part = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    out += /^\d+$/.test(part) ? `[${part}]` : out === '' ? part : `.${part}`
  }
  return out === '' ? '(gốc)' : out
}

const TYPE_NAMES: Record<string, string> = {
  string: 'chuỗi',
  number: 'số',
  integer: 'số nguyên',
  boolean: 'true/false',
  array: 'danh sách',
  object: 'đối tượng',
  null: 'null',
}

const PATTERN_HINTS: Record<string, string> = {
  '^\\d{4}\\.[1-3]$': 'cần dạng năm.kỳ, ví dụ 2026.1',
  '^[a-z0-9-]+$': 'chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
  '^[A-Z]+(\\.[0-9]+(\\.[a-z]+)?)?$': 'cần mã phân cấp, ví dụ II, II.3, II.3.b',
}

function show(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : JSON.stringify(value)
}

function formatError(e: ErrorObject): string {
  const p = e.params as Record<string, unknown>
  const at = formatPath(e.instancePath)
  switch (e.keyword) {
    case 'required':
      return `${formatPath(e.instancePath, String(p.missingProperty))}: thiếu trường bắt buộc`
    case 'additionalProperties':
      return `${formatPath(e.instancePath, String(p.additionalProperty))}: trường không được phép có`
    case 'type': {
      const types = String(p.type).split(',').map((t) => TYPE_NAMES[t] ?? t)
      return `${at}: sai kiểu dữ liệu, cần ${types.join(' hoặc ')}`
    }
    case 'enum':
      return `${at}: giá trị ${show(e.data)} không hợp lệ, phải là một trong: ${(p.allowedValues as unknown[]).join(', ')}`
    case 'const':
      return `${at}: phải bằng ${show(p.allowedValue)}`
    case 'pattern': {
      const hint = PATTERN_HINTS[String(p.pattern)] ?? `phải khớp mẫu ${String(p.pattern)}`
      return `${at}: ${show(e.data)} sai định dạng, ${hint}`
    }
    case 'format':
      return p.format === 'date'
        ? `${at}: ${show(e.data)} không phải ngày hợp lệ dạng YYYY-MM-DD`
        : `${at}: ${show(e.data)} sai định dạng ${String(p.format)}`
    case 'uniqueItems': {
      const [a, b] = [Number(p.i), Number(p.j)].sort((x, y) => x - y)
      return `${at}: có phần tử bị trùng (vị trí ${a} và ${b})`
    }
    case 'minLength':
      return `${at}: không được để trống`
    case 'minItems':
      return `${at}: cần ít nhất ${String(p.limit)} phần tử`
    case 'exclusiveMinimum':
      return `${at}: phải lớn hơn ${String(p.limit)}`
    default:
      return `${at}: không hợp lệ (${e.message ?? e.keyword})`
  }
}
