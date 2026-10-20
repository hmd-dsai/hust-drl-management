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
