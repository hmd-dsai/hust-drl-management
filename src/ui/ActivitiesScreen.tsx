// Màn hình "Hoạt động" (SPEC mục 7.3, docs/DESIGN.md mục 4.2): danh sách chỉ để đọc, bấm một dòng để sửa trong panel.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { removeActivity } from '../domain/activities.ts'
import { contribution } from '../domain/optimizer.ts'
import { resolveRubric, rubricIndex } from '../domain/rubric.ts'
import { effectiveExcluded } from '../domain/scoring.ts'
import { STATUSES, type Activity, type Status, type UserData } from '../domain/types.ts'
import { validate, type Issue } from '../domain/validate.ts'
import { ActivityPanel } from './ActivityPanel.tsx'
import { formatGain } from './format.ts'
import { Button, Select, StatusIcon, Toast } from './kit/index.ts'
import { STATUS_META, TONE } from './status.ts'

type Recipe = (d: UserData) => UserData

interface Props {
  data: UserData
  onEdit: (recipe: Recipe) => void
  onUndo: () => void
}

type Sort = 'input' | 'status' | 'name' | 'date' | 'points'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'input', label: 'Thứ tự nhập' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'name', label: 'Tên' },
  { id: 'date', label: 'Ngày' },
  { id: 'points', label: 'Điểm' },
]
const STATUS_ORDER: Record<Status, number> = { confirmed: 0, joined: 1, planned: 2, rejected: 3 }

/** Cột: trạng thái · tên · tiêu chí · điểm. Trên điện thoại tiêu chí xuống dòng dưới tên. */
const ROW_GRID =
  'grid w-full grid-cols-[1.25rem_minmax(0,1fr)_2.5rem] gap-x-3 gap-y-1 px-2 sm:grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1.3fr)_2.5rem] sm:gap-x-4'
const NAME_CELL = 'col-[2/3] row-start-1'
const CRIT_CELL = 'col-[2/4] row-start-2 sm:col-[3/4] sm:row-start-1'
const POINTS_CELL = 'col-[3/4] row-start-1 sm:col-[4/5] text-right tabular-nums'

const POINTS_TITLE = 'Điểm "Nếu làm hết dự định" sẽ mất nếu bỏ hoạt động này'

/** Panel đang mở: `null` = đóng, `'new'` = thêm mới, còn lại là id hoạt động đang sửa. */
type PanelState = null | 'new' | string

export function ActivitiesScreen({ data, onEdit, onUndo }: Props) {
  const rubric = resolveRubric(data)
  const index = rubricIndex(rubric)
  const excluded = useMemo(() => effectiveExcluded(data), [data])
  const issues = useMemo(() => validate(rubric, data), [rubric, data])
  const points = useMemo(() => new Map(data.activities.map((a) => [a.id, contribution(rubric, data, a.id)])), [rubric, data])
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [sort, setSort] = useState<Sort>('input')
  const [panel, setPanel] = useState<PanelState>(null)

  // ---- Xoá + hoàn tác ----
  /** `data` = dữ liệu ngay sau khi xoá; đổi khác đi (sửa tiếp, Ctrl+Z…) thì không hoàn tác từ toast được nữa. */
  const [toast, setToast] = useState<{ name: string; data: UserData | null } | null>(null)
  useEffect(() => {
    if (!toast) return
    if (toast.data === null) setToast({ ...toast, data })
    else if (toast.data !== data) setToast(null)
  }, [data]) // chỉ phản ứng khi dữ liệu đổi
  const dismissToast = useCallback(() => setToast(null), [])
  const remove = (a: Activity) => {
    setPanel(null)
    onEdit((d) => removeActivity(d, a.id))
    setToast({ name: a.name, data: null })
  }

  const byActivity = new Map<string, Issue[]>()
  for (const i of issues) if (i.activityId) byActivity.set(i.activityId, [...(byActivity.get(i.activityId) ?? []), i])
  const general = issues.filter((i) => !i.activityId)

  const count = (s: Status) => data.activities.filter((a) => a.status === s).length
  const shown = data.activities
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => filter === 'all' || a.status === filter)
    .sort((x, y) => {
      if (sort === 'status') return STATUS_ORDER[x.a.status] - STATUS_ORDER[y.a.status] || x.i - y.i
      if (sort === 'name') return x.a.name.localeCompare(y.a.name, 'vi')
      if (sort === 'date') return (x.a.date ?? '9999').localeCompare(y.a.date ?? '9999') || x.i - y.i
      if (sort === 'points') return (points.get(y.a.id) ?? 0) - (points.get(x.a.id) ?? 0) || x.i - y.i
      return x.i - y.i
    })
  const editing = panel !== null && panel !== 'new' ? (data.activities.find((a) => a.id === panel) ?? null) : null

  return (
    <main className="mx-auto max-w-[960px] px-4 pt-8 pb-24 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title">Hoạt động</h1>
        <Button variant="primary" onClick={() => setPanel('new')}>
          <span aria-hidden>+</span> Thêm hoạt động
        </Button>
      </div>

      {data.activities.length === 0 ? (
        <p className="mt-6 text-body text-fg-muted">Chưa có hoạt động nào. Bấm "Thêm hoạt động" để bắt đầu.</p>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-x-3 gap-y-3">
            <div role="group" aria-label="Lọc theo trạng thái" className="-ml-2.5 flex flex-wrap gap-0.5 sm:gap-1">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                Tất cả <Count n={data.activities.length} />
              </FilterChip>
              {STATUSES.filter((s) => count(s) > 0 || filter === s).map((s) => (
                <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
                  <span aria-hidden className={TONE[s].fg}>
                    {STATUS_META[s].icon}
                  </span>
                  {/* Điện thoại: chỉ icon + số để vừa một dòng; tên vẫn có cho trình đọc màn hình. */}
                  <span className="sr-only sm:not-sr-only sm:ml-1">{STATUS_META[s].label}</span> <Count n={count(s)} />
                </FilterChip>
              ))}
            </div>
            <label className="flex items-center gap-2 text-small text-fg-muted">
              <span className="sr-only sm:not-sr-only">Sắp xếp</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {general.length > 0 && (
            <ul className="mt-4 space-y-1">
              {general.map((i, k) => (
                <li key={k}>
                  <IssueLine issue={i} />
                </li>
              ))}
            </ul>
          )}

          <div aria-hidden className={`${ROW_GRID} mt-4 hidden border-b border-border pb-2 text-xs font-medium text-fg-subtle sm:grid`}>
            <span className={NAME_CELL}>Hoạt động</span>
            <span className={CRIT_CELL}>Tính cho tiêu chí</span>
            <span className={POINTS_CELL} title={POINTS_TITLE}>
              Điểm
            </span>
          </div>

          {shown.length === 0 ? (
            <p className="mt-4 text-body text-fg-subtle">Không có hoạt động nào ở trạng thái này.</p>
          ) : (
            <ul className="mt-2 border-t border-border sm:mt-0 sm:border-t-0">
              {shown.map(({ a }) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  criterionName={a.chosen === null ? null : (index.get(a.chosen)?.kind === 'criterion' ? index.get(a.chosen)!.node.name : undefined)}
                  points={points.get(a.id) ?? 0}
                  issues={byActivity.get(a.id) ?? []}
                  onOpen={() => setPanel(a.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {panel !== null && (panel === 'new' || editing) && (
        <ActivityPanel
          key={panel}
          rubric={rubric}
          data={data}
          excluded={excluded}
          activity={editing}
          onEdit={onEdit}
          onDelete={remove}
          onClose={() => setPanel(null)}
        />
      )}

      {toast && (
        <Toast
          onDismiss={dismissToast}
          action={{
            label: 'Hoàn tác',
            onClick: () => {
              setToast(null)
              onUndo()
            },
          }}
        >
          Đã xoá “{toast.name}”
        </Toast>
      )}
    </main>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-0.5 text-fg-subtle tabular-nums">{n}</span>
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-small ${active ? 'bg-surface-selected font-medium text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg'}`}
    >
      {children}
    </button>
  )
}

/** Một dòng thông báo validate; dùng thẻ span để đặt được trong nút. */
function IssueLine({ issue }: { issue: Issue }) {
  const warn = issue.severity === 'warning'
  return (
    <span className="flex gap-1.5 text-small text-fg-muted">
      <span aria-hidden className={warn ? TONE.planned.fg : 'text-fg-subtle'}>
        {warn ? '⚠' : 'ⓘ'}
      </span>
      <span>
        <span className="sr-only">{warn ? 'Cảnh báo: ' : 'Lưu ý: '}</span>
        {issue.message}
      </span>
    </span>
  )
}

interface RowProps {
  activity: Activity
  /** Tên tiêu chí đang chọn; `null` nếu chưa chọn, `undefined` nếu mã không có trong rubric. */
  criterionName: string | null | undefined
  points: number
  issues: Issue[]
  onOpen: () => void
}

function ActivityRow({ activity: a, criterionName, points, issues, onOpen }: RowProps) {
  const counted = a.status !== 'rejected' && a.chosen !== null
  const meta = [a.date && formatDate(a.date), a.pinned && 'đã ghim', a.note].filter(Boolean).join(' · ')
  return (
    <li data-activity={a.id} className="border-b border-border">
      <button type="button" onClick={onOpen} className={`${ROW_GRID} items-start rounded-md py-2.5 text-left hover:bg-surface`}>
        <span className="col-[1/2] row-start-1 pt-px">
          <StatusIcon tone={a.status} icon={STATUS_META[a.status].icon} label={STATUS_META[a.status].label} />
        </span>

        <span className={NAME_CELL}>
          <span className={`block font-medium ${a.status === 'rejected' ? 'text-fg-subtle line-through' : 'text-fg'}`}>
            {a.name}
            {issues.length > 0 && (
              <span aria-hidden className={`ml-1.5 ${TONE.planned.fg}`}>
                ⚠
              </span>
            )}
          </span>
          {meta && <span className="mt-0.5 block truncate text-small text-fg-subtle">{meta}</span>}
        </span>

        <span className={`${CRIT_CELL} text-small`}>
          {a.chosen === null ? (
            <span className="text-fg-subtle">Chưa chọn tiêu chí</span>
          ) : (
            <span title={criterionName ?? undefined} className="line-clamp-2 text-fg-muted">
              <span className="mr-1.5 text-xs text-fg-subtle">{a.chosen}</span>
              {criterionName === undefined ? <span className={TONE.planned.fg}>không có trong rubric</span> : criterionName}
            </span>
          )}
        </span>

        <span className={`${POINTS_CELL} ${!counted ? 'text-fg-disabled' : points === 0 ? 'text-fg-subtle' : 'font-medium text-fg'}`} title={POINTS_TITLE}>
          {counted ? formatGain(points) : '—'}
        </span>

        {issues.length > 0 && (
          <span className="col-[2/4] row-start-3 space-y-0.5 sm:col-[2/5] sm:row-start-2">
            {issues.map((i, k) => (
              <IssueLine key={k} issue={i} />
            ))}
          </span>
        )}
      </button>
    </li>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
