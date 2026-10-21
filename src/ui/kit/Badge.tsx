import type { HTMLAttributes, ReactNode } from 'react'
import type { Status } from '../../domain/types.ts'
import { STATUS_META, TONE, type Tone } from '../status.ts'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  icon?: string
  size?: 'sm' | 'md'
  children?: ReactNode
}

const SIZE = { sm: 'px-1.5 py-0.5 text-xs', md: 'px-2 py-0.5 text-small' }

/** Nhãn nhỏ nền nhạt, không viền (docs/DESIGN.md mục 3.2). */
export function Badge({ tone = 'neutral', icon, size = 'sm', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm font-medium whitespace-nowrap ${SIZE[size]} ${TONE[tone].soft} ${TONE[tone].fg} ${className}`}
      {...rest}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  )
}

/**
 * Badge chỉ có icon, dùng trên các dòng danh sách (docs/DESIGN.md nguyên tắc 4).
 * Tên trạng thái nằm ở `aria-label` và tooltip.
 */
export function StatusIcon({ tone, icon, label, className = '' }: { tone: Tone; icon: string; label: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-xs font-semibold ${TONE[tone].soft} ${TONE[tone].fg} ${className}`}
    >
      {icon}
    </span>
  )
}

/** Badge trạng thái hoạt động: icon + tên trạng thái. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const m = STATUS_META[status]
  return (
    <Badge tone={m.tone} icon={m.icon} className={className}>
      {m.label}
    </Badge>
  )
}
