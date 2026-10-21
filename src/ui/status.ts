import type { ScenarioKey } from '../domain/scoring.ts'
import type { Status } from '../domain/types.ts'

/** Tông màu trạng thái (docs/DESIGN.md mục 3.2); `neutral` cho những thứ không phải trạng thái. */
export type Tone = Status | 'neutral'

/** Class theo token cho từng tông. Viết đủ tên class để Tailwind quét được. */
export const TONE: Record<Tone, { fg: string; bar: string; soft: string }> = {
  planned: { fg: 'text-planned-fg', bar: 'bg-planned-bar', soft: 'bg-planned-soft' },
  joined: { fg: 'text-joined-fg', bar: 'bg-joined-bar', soft: 'bg-joined-soft' },
  confirmed: { fg: 'text-confirmed-fg', bar: 'bg-confirmed-bar', soft: 'bg-confirmed-soft' },
  rejected: { fg: 'text-rejected-fg', bar: 'bg-rejected-bar', soft: 'bg-rejected-soft' },
  neutral: { fg: 'text-fg-muted', bar: 'bg-fg-subtle', soft: 'bg-surface-selected' },
}

/** Nhãn và icon cho từng trạng thái. Không dùng màu làm tín hiệu duy nhất: icon mỗi trạng thái một hình. */
export const STATUS_META: Record<Status, { label: string; icon: string; tone: Status }> = {
  planned: { label: 'Dự định', icon: '○', tone: 'planned' },
  joined: { label: 'Đã tham gia', icon: '◐', tone: 'joined' },
  confirmed: { label: 'Đã xác nhận', icon: '✓', tone: 'confirmed' },
  rejected: { label: 'Không được', icon: '✕', tone: 'rejected' },
}

const PLANNED_STRIPES =
  'bg-[repeating-linear-gradient(135deg,var(--color-planned-bar)_0_4px,var(--color-planned-stripe)_4px_8px)]'

/**
 * Màu theo kịch bản cho thanh tiến độ xếp chồng: xanh lá (hiện tại) → xanh dương (đã tham gia) → vàng (kế hoạch).
 * Icon trùng với icon trạng thái tương ứng; phần kế hoạch có sọc để phân biệt cả khi không nhìn rõ màu.
 */
export const SCENARIO_META: Record<
  ScenarioKey,
  {
    /** Tên kịch bản theo thuật ngữ thống nhất (docs/DESIGN.md mục 2.1). */
    long: string
    /** Phần cộng thêm so với kịch bản trước, ví dụ "+6 chờ xác nhận". */
    delta: string
    icon: string
    tone: Status
    bar: string
    text: string
  }
> = {
  confirmed: {
    long: 'Điểm hiện tại',
    delta: 'đã xác nhận',
    icon: STATUS_META.confirmed.icon,
    tone: 'confirmed',
    bar: TONE.confirmed.bar,
    text: TONE.confirmed.fg,
  },
  done: {
    long: 'Nếu được xác nhận hết',
    delta: 'chờ xác nhận',
    icon: STATUS_META.joined.icon,
    tone: 'joined',
    bar: TONE.joined.bar,
    text: TONE.joined.fg,
  },
  projected: {
    long: 'Nếu làm hết dự định',
    delta: 'dự định',
    icon: STATUS_META.planned.icon,
    tone: 'planned',
    bar: PLANNED_STRIPES,
    text: TONE.planned.fg,
  },
}
