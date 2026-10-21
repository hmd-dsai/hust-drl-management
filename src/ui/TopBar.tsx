import type { UserData } from '../domain/types.ts'
import { Button, IconButton, Select } from './kit/index.ts'

export type Tab = 'status' | 'activities' | 'suggest'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'status', label: 'Trạng thái ĐRL' },
  { id: 'activities', label: 'Hoạt động' },
  { id: 'suggest', label: 'Gợi ý' },
]

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
  tab: Tab
  onTab: (tab: Tab) => void
  onShortcuts: () => void
}

/** Thanh trên cùng (SPEC mục 7.1). */
export function TopBar(p: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap">
          <span className="font-semibold">ĐRL HUST</span>
          <label className="flex items-center gap-1 text-sm">
            <span className="text-fg-subtle">Học kỳ</span>
            {p.semesters.length > 1 ? (
              <Select value={p.data.semester} onChange={(e) => p.onSwitchSemester(e.target.value)} className="h-7">
                {p.semesters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="font-medium">{p.data.semester}</span>
            )}
          </label>
          <span className="text-sm text-fg-subtle">Rubric {p.rubricId}</span>
          {p.dirty && (
            <span
              className="flex items-center gap-1.5 text-sm text-fg-muted"
              title="Có thay đổi chưa tải xuống. Bản nháp vẫn được lưu trong trình duyệt, nhưng file JSON mới là bản lưu chính thức."
            >
              <span aria-hidden className="size-2 rounded-full bg-planned-bar" />
              Chưa tải xuống
            </span>
          )}
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-1">
          <IconButton label="Hoàn tác" shortcut="Ctrl+Z" onClick={p.onUndo} disabled={!p.canUndo}>
            ↶
          </IconButton>
          <IconButton label="Làm lại" shortcut="Ctrl+Shift+Z" onClick={p.onRedo} disabled={!p.canRedo}>
            ↷
          </IconButton>
          <Button variant={p.dirty ? 'primary' : 'secondary'} onClick={p.onDownload} title="Tải xuống (Ctrl+S)" className="ml-1">
            Tải xuống
          </Button>
          <Button onClick={p.onUpload}>Tải lên</Button>
          <Button onClick={p.onNew}>Tạo dữ liệu mới</Button>
          <IconButton label="Phím tắt" shortcut="?" onClick={p.onShortcuts}>
            ?
          </IconButton>
        </nav>
      </div>
      <nav aria-label="Màn hình" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={p.tab === t.id ? 'page' : undefined}
            onClick={() => p.onTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-medium ${
              p.tab === t.id ? 'border-fg text-fg' : 'border-transparent text-fg-subtle hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
