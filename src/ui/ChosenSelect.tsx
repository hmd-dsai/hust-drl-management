import { useMemo } from 'react'
import { rankChoices } from '../domain/optimizer.ts'
import { rubricIndex } from '../domain/rubric.ts'
import type { Activity, Rubric, UserData } from '../domain/types.ts'
import { Select } from './kit/index.ts'

interface Props {
  rubric: Rubric
  user: UserData
  /** Hoạt động đang sửa (có thể là bản nháp chưa có trong `user`). */
  activity: Activity
  value: string | null
  onChange: (criterionId: string | null) => void
  excluded: ReadonlySet<string>
  id?: string
  className?: string
}

export function formatGain(gain: number): string {
  return gain > 0 ? `+${gain}` : gain < 0 ? `−${-gain}` : '+0'
}

/** Chọn tiêu chí trong `eligible`, mỗi lựa chọn kèm "+N điểm" (marginalGain), xếp theo gain giảm dần. */
export function ChosenSelect({ rubric, user, activity, value, onChange, excluded, id, className = '' }: Props) {
  const index = rubricIndex(rubric)
  const choices = useMemo(() => rankChoices(rubric, user, activity), [rubric, user, activity])
  const unknown = value !== null && index.get(value)?.kind !== 'criterion'
  const outside = value !== null && !unknown && !choices.some((c) => c.criterionId === value)
  // gain của lựa chọn đang lưu luôn là 0 (so với chính nó): hiện "đang chọn" cho dễ hiểu
  const stored = user.activities.find((a) => a.id === activity.id)?.chosen ?? null
  return (
    <Select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={choices.length === 0 && value === null}
      className={className}
    >
      <option value="">{choices.length === 0 ? '— Chọn tiêu chí có thể dùng trước —' : '— Chưa chọn —'}</option>
      {choices.map((c) => {
        const crit = index.get(c.criterionId)!.node
        return (
          <option key={c.criterionId} value={c.criterionId}>
            {c.criterionId} · {c.criterionId === stored ? 'đang chọn' : `${formatGain(c.gain)} điểm`}
            {excluded.has(c.criterionId) ? ' · đang loại trừ' : ''} · {crit.name}
          </option>
        )
      })}
      {(unknown || outside) && (
        <option value={value!}>
          {value} · {unknown ? 'không có trong rubric' : 'không nằm trong danh sách có thể dùng'}
        </option>
      )}
    </Select>
  )
}
