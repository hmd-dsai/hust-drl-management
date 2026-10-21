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

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-small',
  md: 'h-8 px-3 text-body',
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
  children: ReactNode
}

/** Nút chỉ có icon, kèm tooltip hiện khi rê chuột hoặc focus bằng bàn phím. */
export function IconButton({ label, shortcut, type = 'button', className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`group/tip relative inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-transparent ${className}`}
      {...rest}
    >
      <span aria-hidden>{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 -translate-x-1/2 rounded-md bg-fg px-2 py-1 text-xs font-medium whitespace-nowrap text-canvas opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100"
      >
        {label}
        {shortcut && <span className="ml-1.5 text-fg-disabled">{shortcut}</span>}
      </span>
    </button>
  )
}
