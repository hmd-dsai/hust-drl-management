import type { ScenarioKey } from '../domain/scoring.ts'
import type { Status } from '../domain/types.ts'

/** Nhãn, icon và màu cho từng trạng thái. Không dùng màu làm tín hiệu duy nhất: luôn kèm icon + chữ. */
export const STATUS_META: Record<Status, { label: string; icon: string; badge: string }> = {
  planned: {
    label: 'Dự định',
    icon: '○',
    badge: 'bg-yellow-100 text-yellow-900 ring-yellow-400 dark:bg-yellow-400/15 dark:text-yellow-200 dark:ring-yellow-400/40',
  },
  joined: {
    label: 'Đã tham gia',
    icon: '◐',
    badge: 'bg-blue-100 text-blue-900 ring-blue-400 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-400/40',
  },
  confirmed: {
    label: 'Đã xác nhận',
    icon: '✓',
    badge: 'bg-green-100 text-green-900 ring-green-500 dark:bg-green-400/15 dark:text-green-200 dark:ring-green-400/40',
  },
  rejected: {
    label: 'Không được',
    icon: '✕',
    badge: 'bg-red-100 text-red-900 ring-red-400 dark:bg-red-400/15 dark:text-red-200 dark:ring-red-400/40',
  },
}

/**
 * Màu theo kịch bản cho thanh tiến độ xếp chồng: xanh lá (hiện tại) → xanh dương (đã tham gia) → vàng (kế hoạch).
 * Icon trùng với icon trạng thái tương ứng; phần kế hoạch có sọc để phân biệt cả khi không nhìn rõ màu.
 */
export const SCENARIO_META: Record<ScenarioKey, { short: string; icon: string; bar: string; text: string }> = {
  confirmed: {
    short: 'Hiện tại',
    icon: STATUS_META.confirmed.icon,
    bar: 'bg-green-600 dark:bg-green-500',
    text: 'text-green-700 dark:text-green-400',
  },
  done: {
    short: 'Đã tham gia',
    icon: STATUS_META.joined.icon,
    bar: 'bg-blue-500 dark:bg-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
  },
  projected: {
    short: 'Kế hoạch',
    icon: STATUS_META.planned.icon,
    bar: 'bg-[repeating-linear-gradient(135deg,var(--color-yellow-400)_0_4px,var(--color-yellow-300)_4px_8px)] dark:bg-[repeating-linear-gradient(135deg,var(--color-yellow-300)_0_4px,var(--color-yellow-500)_4px_8px)]',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
}
