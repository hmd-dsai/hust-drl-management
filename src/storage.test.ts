import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { UserData } from './domain/types.ts'
import { initialState, reducer, type AppState } from './state.ts'
import {
  createDraftStore,
  createEmptyUserData,
  downloadFileName,
  guessSemester,
  isDirty,
  normalizeUserData,
  parseUserDataFile,
  serializeUserData,
} from './storage.ts'

const sampleText = readFileSync(new URL('../data/samples/2026.1.json', import.meta.url), 'utf8')

function parseOk(text: string): UserData {
  const res = parseUserDataFile(text)
  if (!res.ok) throw new Error(res.errors.join('\n'))
  return res.value
}

/** Storage giả trong bộ nhớ, đủ API mà storage.ts dùng. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  failWrites = false
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('QuotaExceededError')
    this.map.set(key, value)
  }
}

describe('serialize', () => {
  it('sample: serialize lại giống hệt file gốc', () => {
    expect(serializeUserData(parseOk(sampleText))).toBe(sampleText.endsWith('\n') ? sampleText : sampleText + '\n')
  })

  it('round-trip: tải lên → sửa → tải xuống → tải lên lại giữ nguyên dữ liệu', () => {
    let state: AppState = initialState({ data: parseOk(sampleText), savedSnapshot: null })
    state = reducer(state, {
      type: 'edit',
      recipe: (d) => ({
        ...d,
        excludedCriteria: [...(d.excludedCriteria ?? []), 'V.1.a'],
        activities: [
          ...d.activities.map((a) => (a.id === 'hop-lop' ? { ...a, status: 'confirmed' as const, note: 'Đã điểm danh "đủ"' } : a)),
          { id: 'moi', name: 'Hoạt động mới — tiếng Việt', status: 'planned', eligible: ['II.1.c'], chosen: 'II.1.c', date: '2026-11-02', pinned: true },
        ],
      }),
    })
    const edited = state.doc!.data
    const file = serializeUserData(edited)
    const reloaded = parseOk(file)
    expect(reloaded).toEqual(normalizeUserData(edited))
    expect(serializeUserData(reloaded)).toBe(file)
  })

  it('thứ tự khoá cố định, bỏ undefined, thêm excludedCriteria rỗng', () => {
    const user = {
      activities: [{ chosen: null, eligible: [], status: 'planned', name: 'A', id: 'a', note: undefined }],
      rubric: '2026.1',
      semester: '2026.1',
      schemaVersion: 1,
    } as unknown as UserData
    expect(serializeUserData(user)).toBe(
      `{
  "schemaVersion": 1,
  "semester": "2026.1",
  "rubric": "2026.1",
  "excludedCriteria": [],
  "activities": [
    {
      "id": "a",
      "name": "A",
      "status": "planned",
      "eligible": [],
      "chosen": null
    }
  ]
}
`,
    )
  })

  it('tên file tải xuống', () => {
    expect(downloadFileName('2026.1', new Date(2026, 9, 21, 8, 5))).toBe('drl-2026.1-20261021-0805.json')
  })
})

describe('parseUserDataFile', () => {
  it('file hỏng cú pháp', () => {
    const res = parseUserDataFile('{ "semester": ')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors[0]).toMatch(/^File không phải JSON hợp lệ/)
  })

  it('file sai schema: báo vị trí lỗi bằng tiếng Việt', () => {
    const bad = sampleText.replace('"status": "joined"', '"status": "xong"')
    const res = parseUserDataFile(bad)
    expect(res).toEqual({
      ok: false,
      errors: ['activities[1].status: giá trị "xong" không hợp lệ, phải là một trong: planned, joined, confirmed, rejected'],
    })
  })
})

describe('isDirty', () => {
  const data = parseOk(sampleText)

  it('chưa tải xuống lần nào → có thay đổi', () => {
    expect(isDirty(data, null)).toBe(true)
  })

  it('giống snapshot → không có thay đổi', () => {
    expect(isDirty(data, serializeUserData(data))).toBe(false)
  })

  it('thứ tự khoá khác nhưng cùng dữ liệu → không có thay đổi', () => {
    const reordered = Object.fromEntries(Object.entries(data).reverse()) as unknown as UserData
    expect(isDirty(reordered, serializeUserData(data))).toBe(false)
  })

  it('sửa rồi undo về như cũ → không có thay đổi', () => {
    const snapshot = serializeUserData(data)
    let state = initialState({ data, savedSnapshot: snapshot })
    state = reducer(state, { type: 'edit', recipe: (d) => ({ ...d, excludedCriteria: [] }) })
    expect(isDirty(state.doc!.data, snapshot)).toBe(true)
    state = reducer(state, { type: 'undo' })
    expect(isDirty(state.doc!.data, snapshot)).toBe(false)
  })

  it('đánh dấu đã lưu sau khi tải xuống', () => {
    let state = initialState({ data, savedSnapshot: null })
    state = reducer(state, { type: 'saved', snapshot: serializeUserData(data) })
    expect(isDirty(state.doc!.data, state.doc!.savedSnapshot)).toBe(false)
  })
})

describe('reducer: undo/redo', () => {
  const base = createEmptyUserData('2026.1')
  const rename = (n: number) => ({ type: 'edit' as const, recipe: (d: UserData) => ({ ...d, rubric: `r${n}` }) })

  it('undo và redo theo đúng thứ tự', () => {
    let s = initialState({ data: base, savedSnapshot: null })
    s = reducer(s, rename(1))
    s = reducer(s, rename(2))
    s = reducer(s, { type: 'undo' })
    expect(s.doc!.data.rubric).toBe('r1')
    s = reducer(s, { type: 'undo' })
    expect(s.doc!.data.rubric).toBe('2026.1')
    expect(reducer(s, { type: 'undo' })).toBe(s)
    s = reducer(s, { type: 'redo' })
    s = reducer(s, { type: 'redo' })
    expect(s.doc!.data.rubric).toBe('r2')
    expect(reducer(s, { type: 'redo' })).toBe(s)
  })

  it('sửa mới thì xoá nhánh redo', () => {
    let s = initialState({ data: base, savedSnapshot: null })
    s = reducer(s, rename(1))
    s = reducer(s, { type: 'undo' })
    s = reducer(s, rename(3))
    expect(s.future).toEqual([])
  })

  it('giữ được ít nhất 20 bước', () => {
    let s = initialState({ data: base, savedSnapshot: null })
    for (let i = 1; i <= 30; i++) s = reducer(s, rename(i))
    for (let i = 0; i < 20; i++) s = reducer(s, { type: 'undo' })
    expect(s.doc!.data.rubric).toBe('r10')
  })

  it('recipe trả về đúng object cũ thì không tạo bước mới', () => {
    const s = initialState({ data: base, savedSnapshot: null })
    expect(reducer(s, { type: 'edit', recipe: (d) => d })).toBe(s)
  })

  it('load xoá lịch sử', () => {
    let s = initialState({ data: base, savedSnapshot: null })
    s = reducer(s, rename(1))
    s = reducer(s, { type: 'load', doc: { data: base, savedSnapshot: null } })
    expect(s.past).toEqual([])
  })
})

describe('createDraftStore', () => {
  const data = parseOk(sampleText)

  it('lưu và nạp lại bản nháp, nhớ học kỳ mở gần nhất', () => {
    const storage = new MemoryStorage()
    const store = createDraftStore(storage)
    expect(store.loadLatest()).toBeNull()
    expect(store.save({ data: createEmptyUserData('2025.2'), savedSnapshot: null, updatedAt: 't1' })).toBe(true)
    expect(store.save({ data, savedSnapshot: 'snap', updatedAt: 't2' })).toBe(true)
    expect(store.semesters()).toEqual(['2025.2', '2026.1'])
    expect(store.loadLatest()).toEqual({ data, savedSnapshot: 'snap', updatedAt: 't2' })
    expect(store.load('2025.2')?.data.rubric).toBe('2025.1')
  })

  it('bỏ qua bản nháp hỏng', () => {
    const storage = new MemoryStorage()
    storage.setItem('drl:v1:draft:2026.1', '{hỏng')
    storage.setItem('drl:v1:draft:2026.2', JSON.stringify({ data: { semester: '2026.2' } }))
    storage.setItem('drl:v1:last', '2026.1')
    const store = createDraftStore(storage)
    expect(store.loadLatest()).toBeNull()
    expect(store.load('2026.2')).toBeNull()
  })

  it('ghi thất bại thì trả về false, không throw', () => {
    const storage = new MemoryStorage()
    storage.failWrites = true
    expect(createDraftStore(storage).save({ data, savedSnapshot: null, updatedAt: '' })).toBe(false)
  })

  it('không có localStorage: chạy được, không lưu gì', () => {
    const store = createDraftStore(null)
    expect(store.available).toBe(false)
    expect(store.save({ data, savedSnapshot: null, updatedAt: '' })).toBe(false)
    expect(store.semesters()).toEqual([])
    expect(store.loadLatest()).toBeNull()
  })
})

describe('tạo mới', () => {
  it('rubric tự điền theo học kỳ', () => {
    expect(createEmptyUserData('2025.2').rubric).toBe('2025.1')
    expect(createEmptyUserData('2026.2')).toEqual({
      schemaVersion: 1,
      semester: '2026.2',
      rubric: '2026.1',
      excludedCriteria: [],
      activities: [],
    })
  })

  it.each([
    [new Date(2026, 9, 21), '2026.1'],
    [new Date(2027, 0, 10), '2026.1'],
    [new Date(2027, 2, 1), '2026.2'],
    [new Date(2027, 6, 15), '2026.3'],
  ])('đoán học kỳ %s → %s', (date, expected) => {
    expect(guessSemester(date)).toBe(expected)
  })
})
