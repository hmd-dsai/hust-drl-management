import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-canvas hover:bg-accent-hover disabled:hover:bg-accent',
  secondary: 'border border-border-strong bg-canvas text-fg hover:bg-surface disabled:hover:bg-canvas',
  ghost: 'text-fg-muted hover:bg-surface hover:text-fg disabled:hover:bg-transparent',
}

/** Trên điện thoại cao 44px (vùng chạm tối thiểu), desktop gọn hơn. */
const SIZE: Record<Size, string> = {
  sm: 'h-11 px-3 text-small sm:h-7 sm:px-2.5',
  md: 'h-11 px-3.5 text-body sm:h-8 sm:px-3',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', className = '', ...rest }: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`} {...rest} />
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Tên của nút: dùng làm `aria-label` và nội dung tooltip. */
  label: string
  /** Phím tắt hiện sau tên trong tooltip, ví dụ "Ctrl+Z". */
  shortcut?: string
  /** `end`: tooltip canh mép phải nút, dùng khi nút nằm sát mép phải màn hình. */
  tooltipAlign?: 'center' | 'end'
  children: ReactNode
}

/** Nút chỉ có icon, kèm tooltip hiện khi rê chuột hoặc focus bằng bàn phím. */
export function IconButton({ label, shortcut, tooltipAlign = 'center', type = 'button', className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`group/tip relative inline-flex size-11 items-center sm:size-8 justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-transparent ${className}`}
      {...rest}
    >
      <span aria-hidden>{children}</span>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-full z-20 mt-1.5 rounded-md ${tooltipAlign === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'} bg-fg px-2 py-1 text-xs font-medium whitespace-nowrap text-canvas opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100`}
      >
        {label}
        {shortcut && <span className="ml-1.5 text-fg-disabled">{shortcut}</span>}
      </span>
    </button>
  )
}
