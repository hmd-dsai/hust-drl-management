import type { UserData } from '../domain/types.ts'
import { btn } from './Dialog.tsx'

interface Props {
  data: UserData
  rubricId: string
  dirty: boolean
  semesters: string[]
  canUndo: boolean
  canRedo: boolean
  onSwitchSemester: (semester: string) => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
  onUpload: () => void
  onNew: () => void
}

/** Thanh trên cùng (SPEC mục 7.1). */
export function TopBar(p: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap">
          <span className="font-semibold">ĐRL HUST</span>
          <label className="flex items-center gap-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Học kỳ</span>
            {p.semesters.length > 1 ? (
              <select
                value={p.data.semester}
                onChange={(e) => p.onSwitchSemester(e.target.value)}
                className="rounded border border-slate-300 bg-transparent px-1 py-0.5 dark:border-slate-600"
              >
                {p.semesters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium">{p.data.semester}</span>
            )}
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">Rubric {p.rubricId}</span>
          {p.dirty && (
            <span
              className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300"
              title="Có thay đổi chưa tải xuống. Bản nháp vẫn được lưu trong trình duyệt, nhưng file JSON mới là bản lưu chính thức."
            >
              <span aria-hidden className="size-2 rounded-full bg-amber-500" />
              Chưa tải xuống
            </span>
          )}
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className={btn.secondary} onClick={p.onUndo} disabled={!p.canUndo} title="Hoàn tác (Ctrl+Z)">
            ↶<span className="sr-only">Hoàn tác</span>
          </button>
          <button type="button" className={btn.secondary} onClick={p.onRedo} disabled={!p.canRedo} title="Làm lại (Ctrl+Shift+Z)">
            ↷<span className="sr-only">Làm lại</span>
          </button>
          <button type="button" className={p.dirty ? btn.primary : btn.secondary} onClick={p.onDownload} title="Tải xuống (Ctrl+S)">
            Tải xuống
          </button>
          <button type="button" className={btn.secondary} onClick={p.onUpload}>
            Tải lên
          </button>
          <button type="button" className={btn.secondary} onClick={p.onNew}>
            Tạo dữ liệu mới
          </button>
        </nav>
      </div>
    </header>
  )
}
