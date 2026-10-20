import { describe, expect, it } from 'vitest'
import rubric2025 from '../../data/rubrics/2025.1.json'
import rubric2026 from '../../data/rubrics/2026.1.json'
import sample from '../../data/samples/2026.1.json'
import {
  compareSemester,
  getRubric,
  loadRubrics,
  parseRubric,
  rubricForSemester,
  rubricIndex,
  rubrics,
} from './rubric.ts'
import type { Rubric } from './types.ts'

function rejected(data: unknown): string[] {
  const res = parseRubric(data)
  if (res.ok) throw new Error('mong đợi bị từ chối')
  return res.errors
}

function clone2026(): Rubric {
  return structuredClone(rubric2026) as Rubric
}

describe('rubric đóng gói sẵn', () => {
  it('cả 2 rubric đều hợp lệ', () => {
    expect(parseRubric(rubric2025).ok).toBe(true)
    expect(parseRubric(rubric2026).ok).toBe(true)
  })

  it('nạp đủ và sắp theo id', () => {
    expect(rubrics.map((r) => r.id)).toEqual(['2025.1', '2026.1'])
    expect(getRubric('2026.1')?.name).toMatch(/2026\.1/)
    expect(getRubric('2099.1')).toBeUndefined()
  })
})

describe('rubricForSemester', () => {
  it.each([
    ['2024.2', '2025.1'],
    ['2025.1', '2025.1'],
    ['2025.2', '2025.1'],
    ['2025.3', '2025.1'],
    ['2026.1', '2026.1'],
    ['2026.2', '2026.1'],
    ['2030.1', '2026.1'],
    ['không hợp lệ', '2026.1'],
  ])('%s → %s', (semester, expected) => {
    expect(rubricForSemester(semester).id).toBe(expected)
  })
})

describe('compareSemester', () => {
  it('so sánh theo năm rồi theo kỳ', () => {
    expect(compareSemester('2025.2', '2026.1')).toBeLessThan(0)
    expect(compareSemester('2026.1', '2026.1')).toBe(0)
    expect(compareSemester('2026.3', '2026.2')).toBeGreaterThan(0)
    expect(() => compareSemester('2026.4', '2026.1')).toThrow()
  })
})

describe('rubricIndex', () => {
  const index = rubricIndex(rubrics[1]!)

  it('trả về node kèm cha', () => {
    expect(index.get('II')).toMatchObject({ kind: 'category', parentId: null })
    expect(index.get('II.3')).toMatchObject({ kind: 'group', parentId: 'II' })
    expect(index.get('II.3.b')).toMatchObject({ kind: 'criterion', parentId: 'II.3', node: { points: 6 } })
    expect(index.get('X.1')).toBeUndefined()
  })

  it('chứa đủ mọi node', () => {
    const r = rubrics[1]!
    const count = r.categories.reduce(
      (n, c) => n + 1 + c.groups.reduce((m, g) => m + 1 + g.criteria.length, 0),
      0,
    )
    expect(index.size).toBe(count)
  })

  it('mọi id trong sample 2026.1 đều có trong rubric 2026.1', () => {
    const ids = [
      ...sample.excludedCriteria,
      ...sample.activities.flatMap((a) => [...a.eligible, a.chosen]),
    ]
    for (const id of ids) expect(index.get(id)?.kind, id).toBe('criterion')
  })
})

describe('rubric hỏng bị từ chối', () => {
  it('thiếu trường bắt buộc / sai kiểu', () => {
    const data = clone2026() as unknown as Record<string, unknown>
    delete data.totalMax
    data.categories = 'abc'
    expect(rejected(data)).toEqual([
      'totalMax: thiếu trường bắt buộc',
      'categories: sai kiểu dữ liệu, cần danh sách',
    ])
  })

  it('id trùng', () => {
    const data = clone2026()
    data.categories[0]!.groups[0]!.criteria[1]!.id = 'I.1.a'
    expect(rejected(data)).toEqual(['categories[0].groups[0].criteria[1].id: mã "I.1.a" bị trùng'])
  })

  it('id con không bắt đầu bằng id cha', () => {
    const data = clone2026()
    data.categories[1]!.groups[0]!.id = 'III.9'
    data.categories[0]!.groups[1]!.criteria[0]!.id = 'I.1.z'
    expect(rejected(data)).toEqual([
      'categories[0].groups[1].criteria[0].id: mã "I.1.z" không khớp mã cha, cần dạng I.2.<chữ>',
      'categories[1].groups[0].id: mã "III.9" không khớp mã cha, cần dạng II.<số>',
      // các tiêu chí II.1.* giờ cũng không khớp nhóm cha III.9
      ...data.categories[1]!.groups[0]!.criteria.map(
        (c, i) => `categories[1].groups[0].criteria[${i}].id: mã "${c.id}" không khớp mã cha, cần dạng III.9.<chữ>`,
      ),
    ])
  })

  it('"II.1" không được coi là con của "I"', () => {
    const data = clone2026()
    data.categories[0]!.groups[0]!.id = 'II.7'
    expect(rejected(data)).toContain('categories[0].groups[0].id: mã "II.7" không khớp mã cha, cần dạng I.<số>')
  })

  it('loadRubrics throw khi id không trùng tên file', () => {
    expect(() => loadRubrics({ '../../data/rubrics/2027.1.json': rubric2026 })).toThrow(
      'id "2026.1" không trùng tên file',
    )
  })
})
