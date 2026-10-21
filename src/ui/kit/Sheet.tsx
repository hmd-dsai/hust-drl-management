import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { IconButton } from './Button.tsx'

interface Props {
  title: string
  onClose: () => void
  /** Hàng nút dính ở đáy panel. */
  footer: ReactNode
  /** Ô được focus khi mở; mặc định focus vùng nội dung (không bật bàn phím ảo, không hiện tooltip nút Đóng). */
  initialFocus?: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * Panel trượt từ bên phải (toàn màn hình trên điện thoại), dùng <dialog> gốc để có Esc và khoá focus.
 * Chỉ render khi đang mở.
 */
export function Sheet({ title, onClose, footer, initialFocus, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    // showModal tự focus phần tử đầu tiên (nút Đóng), nên đặt lại focus sau đó.
    ;(initialFocus?.current ?? body.current)?.focus()
  }, []) // chỉ chạy lúc mở
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="sheet-title"
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-[480px] flex-col bg-canvas p-0 text-fg shadow-pop backdrop:bg-fg/20 open:flex"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border py-3 pr-3 pl-5">
        <h2 id="sheet-title" className="text-heading">
          {title}
        </h2>
        <IconButton label="Đóng" shortcut="Esc" tooltipAlign="end" onClick={onClose}>
          ✕
        </IconButton>
      </header>
      <div ref={body} tabIndex={-1} className="flex-1 overflow-y-auto px-5 py-5 outline-none">
        {children}
      </div>
      <footer className="border-t border-border px-5 py-3">{footer}</footer>
    </dialog>
  )
}
