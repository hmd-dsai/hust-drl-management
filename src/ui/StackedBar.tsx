import { SCENARIO_KEYS, type ScenarioKey } from '../domain/scoring.ts'
import { SCENARIO_META } from './status.ts'

interface Props {
  /** Điểm sau kẹp theo từng kịch bản (không giảm dần: hiện tại ≤ đã tham gia ≤ kế hoạch). */
  values: Record<ScenarioKey, number>
  max: number
  /** Mục trừ điểm: vẽ độ lớn |điểm| trên nền |max|, tông đỏ. */
  penalty?: boolean
  className?: string
}

/** Thanh tiến độ xếp chồng xanh lá / xanh dương / vàng trên nền `max` (SPEC mục 7.2). */
export function StackedBar({ values, max, penalty = false, className = 'h-2' }: Props) {
  const total = Math.abs(max)
  const pct = (v: number) => (total > 0 ? (Math.min(Math.abs(v), total) / total) * 100 : 0)
  const segments = SCENARIO_KEYS.map((k, i) => {
    const prev = i === 0 ? 0 : pct(values[SCENARIO_KEYS[i - 1]!])
    return { key: k, width: Math.max(0, pct(values[k]) - prev) }
  })
  const label = SCENARIO_KEYS.map((k) => `${SCENARIO_META[k].short} ${values[k]}`).join(', ') + ` trên ${max}`
  return (
    <div role="img" aria-label={label} title={label} className={`flex w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      {segments.map((s, i) =>
        s.width > 0 ? (
          <div
            key={s.key}
            style={{ width: `${s.width}%` }}
            className={penalty ? ['bg-red-700', 'bg-red-500', 'bg-red-300'][i] : SCENARIO_META[s.key].bar}
          />
        ) : null,
      )}
    </div>
  )
}
