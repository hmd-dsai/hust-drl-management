import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconButton } from './Button.tsx'

export interface MenuItem {
  label: string
  /** Phím tắt hiện mờ bên phải. */
  hint?: string
  onSelect: () => void
}

interface Props {
  /** Tên nút mở menu (aria-label + tooltip). */
  label: string
  icon: ReactNode
  items: MenuItem[]
  /** Dòng chú thích không bấm được ở đầu menu. */
  note?: string
}

/** Nút icon mở danh sách lệnh. Esc / bấm ra ngoài để đóng; ↑ ↓ để di chuyển. */
export function Menu({ label, icon, items, note }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const close = () => {
    setOpen(false)
    root.current?.querySelector<HTMLElement>('button')?.focus()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const els = [...(list.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    els[(i + (e.key === 'ArrowDown' ? 1 : els.length - 1)) % els.length]?.focus()
  }

  return (
    <div ref={root} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <IconButton label={label} tooltipAlign="end" aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {icon}
      </IconButton>
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          className="absolute top-full right-0 z-30 mt-1 min-w-56 rounded-md bg-canvas p-1 shadow-pop"
        >
          {note && <div className="px-3 pt-1.5 pb-1 text-xs text-fg-subtle">{note}</div>}
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                it.onSelect()
              }}
              className="flex h-11 w-full items-center justify-between gap-6 rounded-sm px-3 text-left text-body text-fg hover:bg-surface focus-visible:bg-surface sm:h-8"
            >
              {it.label}
              {it.hint && <span className="text-xs text-fg-subtle">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
