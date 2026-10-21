import type { ReactNode } from 'react'

interface Props<T extends string> {
  value: T
  options: readonly { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

/** Nhóm nút chọn một trong vài lựa chọn, thay cho nhiều checkbox (docs/DESIGN.md mục 4.1). */
export function Segmented<T extends string>({ value, options, onChange, className = '', ...rest }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={rest['aria-label']} className={`inline-flex rounded-md bg-surface-selected p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-sm px-2.5 py-1 text-small font-medium whitespace-nowrap ${
            value === o.value ? 'bg-canvas text-fg shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
