import { useEffect, useRef, type ReactNode } from 'react'

/** Hộp thoại modal dùng <dialog> gốc (Esc để đóng, khoá focus). Chỉ render khi đang mở. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-lg bg-canvas p-0 text-fg shadow-pop backdrop:bg-fg/40"
    >
      <div className="p-5">
        <h2 id="dialog-title" className="text-title">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  )
}
