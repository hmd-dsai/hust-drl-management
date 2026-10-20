import { describe, expect, it } from 'vitest'
import sample from '../../data/samples/2026.1.json'
import { formatPath, parseJsonText, validateUserDataJson } from './schema.ts'

function errorsOf(data: unknown): string[] {
  const res = validateUserDataJson(data)
  if (res.ok) throw new Error('mong đợi bị từ chối')
  return res.errors
}

describe('validateUserDataJson', () => {
  it('chấp nhận sample 2026.1', () => {
    const res = validateUserDataJson(sample)
    expect(res.ok).toBe(true)
  })

  it('từ chối status sai, báo đúng vị trí bằng tiếng Việt', () => {
    const data = structuredClone(sample) as Record<string, unknown> & { activities: Record<string, unknown>[] }
    data.activities[3]!.status = 'done'
    expect(errorsOf(data)).toEqual([
      'activities[3].status: giá trị "done" không hợp lệ, phải là một trong: planned, joined, confirmed, rejected',
    ])
  })

  it('liệt kê mọi lỗi cùng lúc', () => {
    const data = structuredClone(sample) as Record<string, unknown> & { activities: Record<string, unknown>[] }
    data.semester = '2026.4'
    delete data.activities[0]!.name
    data.activities[1]!.chosen = 5
    data.activities[2]!.date = '2026-13-01'
    data.activities[4]!.id = 'Có Dấu'
    data.extra = true
    expect(errorsOf(data)).toEqual(
      expect.arrayContaining([
        'semester: "2026.4" sai định dạng, cần dạng năm.kỳ, ví dụ 2026.1',
        'activities[0].name: thiếu trường bắt buộc',
        'activities[1].chosen: sai kiểu dữ liệu, cần chuỗi hoặc null',
        'activities[2].date: "2026-13-01" không phải ngày hợp lệ dạng YYYY-MM-DD',
        'activities[4].id: "Có Dấu" sai định dạng, chỉ gồm chữ thường không dấu, số và dấu gạch ngang',
        'extra: trường không được phép có',
      ]),
    )
  })

  it('từ chối dữ liệu không phải object', () => {
    expect(errorsOf([])).toEqual(['(gốc): sai kiểu dữ liệu, cần đối tượng'])
  })

  it('từ chối excludedCriteria trùng lặp', () => {
    const data = { ...sample, excludedCriteria: ['II.2.a', 'II.2.a'] }
    expect(errorsOf(data)).toEqual(['excludedCriteria: có phần tử bị trùng (vị trí 0 và 1)'])
  })
})

describe('parseJsonText', () => {
  it('parse JSON hợp lệ', () => {
    expect(parseJsonText('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
  })

  it.each([
    ['', 'File rỗng, không có nội dung JSON.'],
    ['   \n', 'File rỗng, không có nội dung JSON.'],
    ['{\n  "a": 1\n  "b": 2\n}', 'File không phải JSON hợp lệ: lỗi cú pháp ở dòng 3, cột 3. Kiểm tra dấu phẩy, dấu ngoặc và dấu nháy kép quanh tên trường.'],
    ['{"a": 1,}', 'File không phải JSON hợp lệ: lỗi cú pháp ở dòng 1, cột 9. Kiểm tra dấu phẩy, dấu ngoặc và dấu nháy kép quanh tên trường.'],
    ['{"semester": ', 'File không phải JSON hợp lệ: file bị cắt ngang, thiếu dấu đóng } hoặc ].'],
    ['đây không phải JSON', 'File không phải JSON hợp lệ: có ký tự không mong đợi "đ". Kiểm tra dấu phẩy, dấu ngoặc và dấu nháy kép quanh tên trường.'],
  ])('báo lỗi cú pháp tiếng Việt: %j', (text, message) => {
    expect(parseJsonText(text)).toEqual({ ok: false, errors: [message] })
  })
})

describe('formatPath', () => {
  it('chuyển JSON Pointer sang dạng đọc được', () => {
    expect(formatPath('')).toBe('(gốc)')
    expect(formatPath('/activities/3/status')).toBe('activities[3].status')
    expect(formatPath('/activities/0', 'name')).toBe('activities[0].name')
    expect(formatPath('/excludedCriteria/2')).toBe('excludedCriteria[2]')
  })
})
