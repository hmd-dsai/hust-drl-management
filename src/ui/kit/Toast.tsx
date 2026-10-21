import { useEffect, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Nút hành động, ví dụ "Hoàn tác". */
  action?: { label: string; onClick: () => void }
  onDismiss: () => void
  /** Tự ẩn sau bao nhiêu ms. */
  duration?: number
}

/** Thông báo ngắn ở đáy màn hình, tự ẩn. */
export function Toast({ children, action, onDismiss, duration = 6000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-4 rounded-md bg-fg py-2 pr-2 pl-4 text-body text-canvas shadow-pop"
    >
      <span className="min-w-0">{children}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="shrink-0 rounded-sm px-2 py-1 font-medium text-canvas underline-offset-2 hover:underline">
          {action.label}
        </button>
      )}
    </div>
  )
}
