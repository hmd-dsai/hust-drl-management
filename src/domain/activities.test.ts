import { describe, expect, it } from 'vitest'
import sample from '../../data/samples/2026.1.json'
import { patchActivity, removeActivity, slugify, uniqueActivityId, upsertActivity } from './activities.ts'
import { validateUserDataJson } from './schema.ts'
import type { Activity, UserData } from './types.ts'

const user = sample as UserData

describe('slugify / uniqueActivityId', () => {
  it.each([
    ['Tham gia AI Thực chiến 2026', 'tham-gia-ai-thuc-chien-2026'],
    ['Festival "Ngày hội xe điện"', 'festival-ngay-hoi-xe-dien'],
    ['Đội tình nguyện Đông Đô', 'doi-tinh-nguyen-dong-do'],
    ['  Họp lớp — kỳ 1!  ', 'hop-lop-ky-1'],
    ['!!!', 'hoat-dong'],
  ])('%s → %s', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })

  it('thêm hậu tố khi trùng', () => {
    expect(uniqueActivityId('Họp lớp', user)).toBe('hop-lop-2')
    const u = { ...user, activities: [...user.activities, { ...user.activities[0]!, id: 'hop-lop-2' }] }
    expect(uniqueActivityId('Họp lớp', u)).toBe('hop-lop-3')
    expect(uniqueActivityId('Hoàn toàn mới', user)).toBe('hoan-toan-moi')
  })
})

describe('upsertActivity', () => {
  const fresh: Activity = { id: 'moi', name: 'Mới', status: 'planned', eligible: ['V.1.a'], chosen: 'V.1.a' }

  it('thêm vào cuối, không đổi dữ liệu gốc', () => {
    const before = structuredClone(user)
    const u = upsertActivity(user, fresh)
    expect(u.activities.at(-1)).toEqual(fresh)
    expect(u.activities).toHaveLength(user.activities.length + 1)
    expect(user).toEqual(before)
    expect(validateUserDataJson(u).ok).toBe(true)
  })

  it('thay đúng chỗ theo id', () => {
    const u = upsertActivity(user, { ...user.activities[2]!, status: 'confirmed' })
    expect(u.activities[2]!.status).toBe('confirmed')
    expect(u.activities).toHaveLength(user.activities.length)
  })

  it('chọn tiêu chí đang bị loại trừ thì tự bỏ loại trừ', () => {
    const u = upsertActivity(user, { ...fresh, eligible: ['II.2.a'], chosen: 'II.2.a' })
    expect(u.excludedCriteria).toEqual(['II.3.c', 'II.3.d', 'III.1.g'])
  })

  it('hoạt động rejected chọn tiêu chí bị loại trừ thì giữ nguyên loại trừ', () => {
    const u = upsertActivity(user, { ...fresh, status: 'rejected', eligible: ['II.2.a'], chosen: 'II.2.a' })
    expect(u.excludedCriteria).toEqual(user.excludedCriteria)
  })
})

describe('patchActivity / removeActivity', () => {
  it('sửa một phần, bỏ trường rỗng', () => {
    const u = patchActivity(user, 'hop-lop', { status: 'confirmed', note: 'ok', link: '' })
    expect(u.activities.find((a) => a.id === 'hop-lop')).toEqual({
      id: 'hop-lop',
      name: 'Họp lớp',
      status: 'confirmed',
      eligible: ['I.2.a'],
      chosen: 'I.2.a',
      note: 'ok',
    })
    const cleared = patchActivity(u, 'hop-lop', { note: '' })
    expect(cleared.activities.find((a) => a.id === 'hop-lop')).not.toHaveProperty('note')
  })

  it('không có thay đổi thì trả về đúng object cũ', () => {
    expect(patchActivity(user, 'hop-lop', { status: 'joined' })).toBe(user)
    expect(patchActivity(user, 'hop-lop', { eligible: ['I.2.a'] })).toBe(user)
    expect(patchActivity(user, 'khong-co', { status: 'joined' })).toBe(user)
  })

  it('đổi chosen sang tiêu chí bị loại trừ thì tự bỏ loại trừ', () => {
    const u = patchActivity(user, 'tham-gia-ai-thuc-chien-2026', { eligible: ['II.1.b', 'II.2.a'], chosen: 'II.2.a' })
    expect(u.excludedCriteria).not.toContain('II.2.a')
  })

  it('xoá theo id', () => {
    const u = removeActivity(user, 'hop-lop')
    expect(u.activities.map((a) => a.id)).not.toContain('hop-lop')
    expect(u.activities).toHaveLength(user.activities.length - 1)
  })
})
