import type { HTMLAttributes, ReactNode } from 'react'
import type { Status } from '../../domain/types.ts'
import { STATUS_META, TONE, type Tone } from '../status.ts'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  icon?: string
  children?: ReactNode
}

/** Nhãn nhỏ nền nhạt, không viền (docs/DESIGN.md mục 3.2). */
export function Badge({ tone = 'neutral', icon, className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[tone].soft} ${TONE[tone].fg} ${className}`}
      {...rest}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
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
