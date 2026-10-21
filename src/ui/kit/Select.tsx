import type { SelectHTMLAttributes } from 'react'
import { TONE, type Tone } from '../status.ts'

const FIELD = 'rounded-md border text-body hover:border-fg-disabled disabled:cursor-not-allowed disabled:opacity-50'

/** Class chung cho ô nhập một dòng và textarea. */
export const fieldClass = `${FIELD} border-border-strong bg-canvas px-2.5 py-1 text-fg placeholder:text-fg-subtle`

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Tô nền nhạt + chữ theo trạng thái (ô đổi trạng thái hoạt động). */
  tone?: Tone
}

/** Ô chọn gốc của trình duyệt, cùng kiểu với ô nhập. */
export function Select({ tone, className = '', ...rest }: SelectProps) {
  const color = tone ? `border-transparent font-medium ${TONE[tone].soft} ${TONE[tone].fg}` : 'border-border-strong bg-canvas text-fg'
  return <select className={`${FIELD} h-8 px-2 ${color} ${className}`} {...rest} />
}
