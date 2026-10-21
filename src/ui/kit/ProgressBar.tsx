import { SCENARIO_KEYS, type ScenarioKey } from '../../domain/scoring.ts'
import { SCENARIO_META, TONE } from '../status.ts'

interface Props {
  /** Điểm sau kẹp theo từng kịch bản (không giảm dần: hiện tại ≤ đã tham gia ≤ kế hoạch). */
  values: Record<ScenarioKey, number>
  max: number
  /** Mục trừ điểm: vẽ độ lớn |điểm| trên nền |max|, một màu đỏ. */
  penalty?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const HEIGHT = { sm: 'h-1.5', md: 'h-2' }

/** Thanh tiến độ xếp chồng xanh lá / xanh dương / vàng trên nền `max` (SPEC mục 7.2). */
export function ProgressBar({ values, max, penalty = false, size = 'sm', className = '' }: Props) {
  const total = Math.abs(max)
  const pct = (v: number) => (total > 0 ? (Math.min(Math.abs(v), total) / total) * 100 : 0)
  const segments = SCENARIO_KEYS.map((k, i) => {
    const prev = i === 0 ? 0 : pct(values[SCENARIO_KEYS[i - 1]!])
    return { key: k, width: Math.max(0, pct(values[k]) - prev) }
  })
  const label = SCENARIO_KEYS.map((k) => `${SCENARIO_META[k].short} ${values[k]}`).join(', ') + ` trên ${max}`
  return (
    <div role="img" aria-label={label} title={label} className={`flex w-full overflow-hidden rounded-sm bg-track ${HEIGHT[size]} ${className}`}>
      {segments.map((s) =>
        s.width > 0 ? (
          <div key={s.key} style={{ width: `${s.width}%` }} className={penalty ? TONE.rejected.bar : SCENARIO_META[s.key].bar} />
        ) : null,
      )}
    </div>
  )
}
