import type { SelectHTMLAttributes } from 'react'
import { TONE, type Tone } from '../status.ts'

/** Điện thoại: chữ 16px để Safari iOS không tự phóng to khi chạm vào ô, và cao 44px. */
const FIELD =
  'rounded-md border text-base hover:border-fg-disabled focus:border-fg-subtle disabled:cursor-not-allowed disabled:opacity-50 sm:text-body'

/** Class chung cho ô nhập một dòng và textarea. */
export const fieldClass = `${FIELD} border-border-strong bg-canvas px-2.5 py-[9px] text-fg placeholder:text-fg-subtle sm:py-1`

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Tô nền nhạt + chữ theo trạng thái (ô đổi trạng thái hoạt động). */
  tone?: Tone
}

/** Ô chọn gốc của trình duyệt, cùng kiểu với ô nhập. */
export function Select({ tone, className = '', ...rest }: SelectProps) {
  const color = tone ? `border-transparent font-medium ${TONE[tone].soft} ${TONE[tone].fg}` : 'border-border-strong bg-canvas text-fg'
  return <select className={`${FIELD} h-11 px-2 sm:h-8 ${color} ${className}`} {...rest} />
}
