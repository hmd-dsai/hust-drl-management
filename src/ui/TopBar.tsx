import type { UserData } from '../domain/types.ts'
import { Button, IconButton, Menu, Select } from './kit/index.ts'

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
  /** Vừa ghi bản nháp xong: hiện "Đã lưu bản nháp" một lúc. */
  justSaved: boolean
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

/**
 * Thanh trên cùng (SPEC mục 7.1, docs/DESIGN.md mục 4.0).
 * Desktop một dòng; điện thoại hai dòng: học kỳ + lệnh, rồi tab + trạng thái lưu.
 */
export function TopBar(p: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-x-3 px-4 sm:h-12 sm:flex-nowrap sm:px-8">
        <div className="order-1 flex h-12 shrink-0 items-center gap-3">
          <span className="hidden font-semibold whitespace-nowrap sm:inline">ĐRL HUST</span>
          {/* Điện thoại: bỏ chữ "Học kỳ" để học kỳ và các lệnh vừa một dòng. */}
          <span className="hidden text-body whitespace-nowrap text-fg-muted sm:inline">Học kỳ</span>
          {p.semesters.length > 1 ? (
            <Select
              aria-label="Học kỳ"
              title={`Rubric ${p.rubricId}`}
              value={p.data.semester}
              onChange={(e) => p.onSwitchSemester(e.target.value)}
              className="sm:-ml-1 sm:h-7"
            >
              {p.semesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          ) : (
            <span className="text-body font-medium sm:-ml-1 whitespace-nowrap" title={`Rubric ${p.rubricId}`}>
              <span className="sr-only">Học kỳ </span>
              {p.data.semester}
            </span>
          )}
        </div>

        <SaveState dirty={p.dirty} justSaved={p.justSaved} />

        <div className="order-2 ml-auto flex items-center sm:order-4 sm:gap-1">
          <IconButton label="Hoàn tác" shortcut="Ctrl+Z" onClick={p.onUndo} disabled={!p.canUndo}>
            <UndoIcon />
          </IconButton>
          <IconButton label="Làm lại" shortcut="Ctrl+Shift+Z" onClick={p.onRedo} disabled={!p.canRedo}>
            <UndoIcon flip />
          </IconButton>
          <Button variant={p.dirty ? 'primary' : 'secondary'} onClick={p.onDownload} title="Tải xuống file JSON (Ctrl+S)" className="ml-1">
            Tải xuống
          </Button>
          <Menu
            label="Thêm lệnh"
            icon={<span className="text-lg leading-none">⋯</span>}
            note={`Rubric ${p.rubricId}`}
            items={[
              { label: 'Tải lên file JSON…', onSelect: p.onUpload },
              { label: 'Tạo dữ liệu học kỳ mới…', onSelect: p.onNew },
              { label: 'Phím tắt', hint: '?', onSelect: p.onShortcuts },
            ]}
          />
        </div>

        {/* Ngắt dòng trên điện thoại: tab xuống dòng thứ hai. */}
        <div aria-hidden className="order-3 basis-full sm:hidden" />

        <nav aria-label="Màn hình" className="order-4 -mb-px flex self-stretch sm:order-3 sm:ml-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={p.tab === t.id ? 'page' : undefined}
              onClick={() => p.onTab(t.id)}
              className={`flex h-11 items-center border-b-2 px-3 text-body font-medium whitespace-nowrap first:-ml-3 sm:h-auto sm:first:ml-0 ${
                p.tab === t.id ? 'border-fg text-fg' : 'border-transparent text-fg-subtle hover:border-border-strong hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

/**
 * "● Chưa tải xuống" hoặc thoáng hiện "✓ Đã lưu bản nháp" sau mỗi lần ghi bản nháp.
 * Rộng cố định trên desktop để tab không xô lệch; điện thoại chỉ hiện icon cạnh học kỳ.
 */
function SaveState({ dirty, justSaved }: { dirty: boolean; justSaved: boolean }) {
  return (
    <span
      role="status"
      title={dirty ? 'Có thay đổi chưa tải xuống. Bản nháp vẫn được lưu trong trình duyệt, nhưng file JSON mới là bản lưu chính thức.' : undefined}
      className="order-1 flex items-center gap-1.5 text-small whitespace-nowrap text-fg-subtle sm:order-2 sm:w-32"
    >
      {justSaved ? (
        <>
          <span aria-hidden className="text-confirmed-fg">
            ✓
          </span>
          <span className="sr-only sm:not-sr-only">Đã lưu bản nháp</span>
        </>
      ) : dirty ? (
        <>
          <span aria-hidden className="size-2 rounded-full bg-planned-bar" />
          <span className="sr-only sm:not-sr-only">Chưa tải xuống</span>
        </>
      ) : null}
    </span>
  )
}

function UndoIcon({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 ${flip ? '-scale-x-100' : ''}`} aria-hidden>
      <path d="M6 3 2.5 6.5 6 10M3 6.5h6.5a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
