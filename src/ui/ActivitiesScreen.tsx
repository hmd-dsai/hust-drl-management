// Màn hình "Hoạt động" (SPEC mục 7.3): form thêm hoạt động + danh sách sửa trực tiếp.

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { patchActivity, removeActivity, uniqueActivityId, upsertActivity } from '../domain/activities.ts'
import { bestChoice, marginalGain } from '../domain/optimizer.ts'
import { resolveRubric, rubricIndex } from '../domain/rubric.ts'
import { effectiveExcluded } from '../domain/scoring.ts'
import { STATUSES, type Activity, type Rubric, type Status, type UserData } from '../domain/types.ts'
import { validate, type Issue } from '../domain/validate.ts'
import { ChosenSelect, formatGain } from './ChosenSelect.tsx'
import { CriterionPicker } from './CriterionPicker.tsx'
import { btn } from './Dialog.tsx'
import { STATUS_META } from './status.ts'

type Recipe = (d: UserData) => UserData

interface Props {
  data: UserData
  onEdit: (recipe: Recipe) => void
}

const input =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900'

export function ActivitiesScreen({ data, onEdit }: Props) {
  const rubric = resolveRubric(data)
  const excluded = useMemo(() => effectiveExcluded(data), [data])
  const issues = useMemo(() => validate(rubric, data), [rubric, data])
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AddForm rubric={rubric} data={data} excluded={excluded} onEdit={onEdit} />
      <ActivityList rubric={rubric} data={data} excluded={excluded} issues={issues} onEdit={onEdit} />
    </main>
  )
}

// ---------- Form thêm hoạt động ----------

const DRAFT_ID = '__moi__'

function AddForm({ rubric, data, excluded, onEdit }: { rubric: Rubric; data: UserData; excluded: ReadonlySet<string>; onEdit: Props['onEdit'] }) {
  const [name, setName] = useState('')
  const [eligible, setEligible] = useState<string[]>([])
  /** `undefined` = chưa tự chọn: dùng lựa chọn gain cao nhất. */
  const [picked, setPicked] = useState<string | null | undefined>(undefined)
  const [status, setStatus] = useState<Status>('planned')
  const [extra, setExtra] = useState({ date: '', link: '', note: '' })
  const nameRef = useRef<HTMLInputElement>(null)

  const draft: Activity = { id: DRAFT_ID, name: name.trim(), status, eligible, chosen: null }
  const best = bestChoice(rubric, data, draft)
  const chosen = picked !== undefined && (picked === null || eligible.includes(picked)) ? picked : best
  const gain = chosen === null ? 0 : marginalGain(rubric, data, draft, chosen)

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return nameRef.current?.focus()
    onEdit((d) => {
      const a: Activity = { id: uniqueActivityId(trimmed, d), name: trimmed, status, eligible, chosen }
      for (const k of ['date', 'link', 'note'] as const) if (extra[k].trim()) a[k] = extra[k].trim()
      return upsertActivity(d, a)
    })
    setName('')
    setEligible([])
    setPicked(undefined)
    setStatus('planned')
    setExtra({ date: '', link: '', note: '' })
    nameRef.current?.focus()
  }

  return (
    <section aria-labelledby="them-hd" className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h2 id="them-hd" className="font-semibold">
        Thêm hoạt động
      </h2>
      <form
        className="mt-3 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field n={1} label="Tên hoạt động" htmlFor="hd-ten">
          <input
            id="hd-ten"
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Hiến máu nhân đạo tháng 11"
            className={`${input} w-full`}
          />
        </Field>
        <Field n={2} label="Tiêu chí có thể dùng" hint="Chọn mọi tiêu chí mà nhà trường có thể tính cho hoạt động này.">
          <CriterionPicker rubric={rubric} selected={eligible} onChange={setEligible} excluded={excluded} />
        </Field>
        <Field n={3} label="Tiêu chí định chọn" htmlFor="hd-chon" hint="Mặc định là lựa chọn được nhiều điểm nhất.">
          <div className="flex flex-wrap items-center gap-2">
            <ChosenSelect
              id="hd-chon"
              rubric={rubric}
              user={data}
              activity={draft}
              value={chosen}
              onChange={setPicked}
              excluded={excluded}
              className="w-full sm:w-auto sm:max-w-xl"
            />
            {chosen !== null && (
              <span className={`text-sm font-medium ${gain > 0 ? 'text-green-700 dark:text-green-400' : 'text-slate-500'}`}>
                {formatGain(gain)} điểm nếu làm hết kế hoạch
              </span>
            )}
          </div>
        </Field>
        <Field n={4} label="Trạng thái">
          <StatusRadio value={status} onChange={setStatus} name="hd-trang-thai" />
        </Field>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600 dark:text-slate-400">5. Ngày, link, ghi chú (không bắt buộc)</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr]">
            <input type="date" aria-label="Ngày" value={extra.date} onChange={(e) => setExtra({ ...extra, date: e.target.value })} className={input} />
            <input type="url" aria-label="Link" placeholder="Link" value={extra.link} onChange={(e) => setExtra({ ...extra, link: e.target.value })} className={input} />
            <textarea
              aria-label="Ghi chú"
              placeholder="Ghi chú"
              rows={2}
              value={extra.note}
              onChange={(e) => setExtra({ ...extra, note: e.target.value })}
              className={`${input} sm:col-span-2`}
            />
          </div>
        </details>
        <button type="submit" className={btn.primary} disabled={!name.trim()}>
          Thêm hoạt động
        </button>
      </form>
    </section>
  )
}

function Field({ n, label, htmlFor, hint, children }: { n: number; label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {n}. {label}
      </label>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  )
}

function StatusRadio({ value, onChange, name }: { value: Status; onChange: (s: Status) => void; name: string }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <label
          key={s}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-sm ring-1 ${
            value === s ? `${STATUS_META[s].badge} font-medium ring-2` : 'ring-slate-300 dark:ring-slate-600'
          }`}
        >
          <input type="radio" name={name} value={s} checked={value === s} onChange={() => onChange(s)} className="sr-only" />
          {STATUS_META[s].icon} {STATUS_META[s].label}
        </label>
      ))}
    </div>
  )
}

// ---------- Danh sách ----------

type Sort = 'input' | 'status' | 'name' | 'date'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'input', label: 'Thứ tự nhập' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'name', label: 'Tên' },
  { id: 'date', label: 'Ngày' },
]
const STATUS_ORDER: Record<Status, number> = { confirmed: 0, joined: 1, planned: 2, rejected: 3 }

interface ListProps {
  rubric: Rubric
  data: UserData
  excluded: ReadonlySet<string>
  issues: Issue[]
  onEdit: Props['onEdit']
}

function ActivityList({ rubric, data, excluded, issues, onEdit }: ListProps) {
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [sort, setSort] = useState<Sort>('input')
  const [openId, setOpenId] = useState<string | null>(null)

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
      return x.i - y.i
    })

  return (
    <section aria-labelledby="ds-hd">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="ds-hd" className="font-semibold">
          Hoạt động ({data.activities.length})
        </h2>
        <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Tất cả {data.activities.length}
          </FilterChip>
          {STATUSES.map((s) => (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} className={filter === s ? STATUS_META[s].badge : ''}>
              {STATUS_META[s].icon} {STATUS_META[s].label} {count(s)}
            </FilterChip>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-1 text-sm">
          Sắp xếp
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={input}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {general.length > 0 && (
        <ul className="mt-3 space-y-1">
          {general.map((i, k) => (
            <IssueLine key={k} issue={i} />
          ))}
        </ul>
      )}

      {data.activities.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Chưa có hoạt động nào. Thêm hoạt động đầu tiên ở form phía trên.</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Không có hoạt động nào ở trạng thái này.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {shown.map(({ a }) => (
            <ActivityRow
              key={a.id}
              activity={a}
              rubric={rubric}
              data={data}
              excluded={excluded}
              issues={byActivity.get(a.id) ?? []}
              open={openId === a.id}
              onToggleOpen={() => setOpenId(openId === a.id ? null : a.id)}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function FilterChip({ active, onClick, className = '', children }: { active: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-sm ring-1 ${
        active ? `font-medium ring-2 ${className || 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900'}` : 'ring-slate-300 dark:ring-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

function IssueLine({ issue }: { issue: Issue }) {
  const warn = issue.severity === 'warning'
  return (
    <li className={`flex gap-1.5 text-sm ${warn ? 'text-amber-800 dark:text-amber-300' : 'text-sky-800 dark:text-sky-300'}`}>
      <span aria-hidden>{warn ? '⚠' : 'ℹ'}</span>
      <span>
        <span className="sr-only">{warn ? 'Cảnh báo: ' : 'Lưu ý: '}</span>
        {issue.message}
      </span>
    </li>
  )
}

const ROW_BORDER: Record<Status, string> = {
  confirmed: 'border-l-green-600 dark:border-l-green-500',
  joined: 'border-l-blue-500 dark:border-l-blue-400',
  planned: 'border-l-yellow-400 dark:border-l-yellow-300',
  rejected: 'border-l-red-500 dark:border-l-red-400',
}

interface RowProps {
  activity: Activity
  rubric: Rubric
  data: UserData
  excluded: ReadonlySet<string>
  issues: Issue[]
  open: boolean
  onToggleOpen: () => void
  onEdit: Props['onEdit']
}

function ActivityRow({ activity: a, rubric, data, excluded, issues, open, onToggleOpen, onEdit }: RowProps) {
  const patch = (p: Partial<Omit<Activity, 'id'>>) => onEdit((d) => patchActivity(d, a.id, p))
  const index = rubricIndex(rubric)
  const detailId = `hd-${a.id}`
  return (
    <li data-activity={a.id} className={`border-l-4 px-3 py-2 ${ROW_BORDER[a.status]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={a.status}
          aria-label="Trạng thái"
          onChange={(e) => patch({ status: e.target.value as Status })}
          className={`rounded px-1.5 py-1 text-sm ring-1 ${STATUS_META[a.status].badge}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].icon} {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <CommitInput
          value={a.name}
          aria-label="Tên hoạt động"
          required
          onCommit={(name) => patch({ name })}
          className="min-w-40 flex-1 rounded border border-transparent bg-transparent px-1 py-1 font-medium hover:border-slate-300 focus:border-slate-400 dark:hover:border-slate-600"
        />
        {a.pinned && (
          <span title="Đã ghim: bộ gợi ý sẽ không đổi tiêu chí" className="text-sm">
            📌<span className="sr-only">Đã ghim</span>
          </span>
        )}
        <ChosenSelect
          rubric={rubric}
          user={data}
          activity={a}
          value={a.chosen}
          onChange={(chosen) => patch({ chosen })}
          excluded={excluded}
          className="w-full max-w-full sm:w-64"
        />
        <button type="button" aria-expanded={open} aria-controls={detailId} onClick={onToggleOpen} className={btn.secondary}>
          {open ? 'Xong' : 'Sửa'}
        </button>
        <button
          type="button"
          aria-label={`Xoá ${a.name}`}
          title="Xoá (có thể hoàn tác)"
          onClick={() => onEdit((d) => removeActivity(d, a.id))}
          className="px-1 text-slate-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span>
          Có thể dùng:{' '}
          {a.eligible.length === 0
            ? 'chưa có'
            : a.eligible.map((id) => (
                <span key={id} title={index.get(id)?.node.name ?? 'Không có trong rubric'} className={`mr-1 font-mono ${id === a.chosen ? 'font-semibold text-slate-900 dark:text-slate-100' : ''}`}>
                  {id}
                </span>
              ))}
        </span>
        {a.date && <span>📅 {a.date}</span>}
        {a.link && (
          <a href={a.link} target="_blank" rel="noreferrer" className="underline">
            🔗 link
          </a>
        )}
        {a.note && <span className="truncate">📝 {a.note}</span>}
      </div>
      {issues.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {issues.map((i, k) => (
            <IssueLine key={k} issue={i} />
          ))}
        </ul>
      )}
      {open && (
        <div id={detailId} className="mt-3 space-y-3 rounded-md bg-slate-50 p-3 dark:bg-slate-900/60">
          <div>
            <div className="mb-1 text-sm font-medium">Tiêu chí có thể dùng</div>
            <CriterionPicker rubric={rubric} selected={a.eligible} onChange={(eligible) => patch({ eligible })} excluded={excluded} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <input type="date" aria-label="Ngày" value={a.date ?? ''} onChange={(e) => patch({ date: e.target.value })} className={input} />
            <CommitInput type="url" aria-label="Link" placeholder="Link" value={a.link ?? ''} onCommit={(link) => patch({ link })} className={input} />
            <CommitInput multiline aria-label="Ghi chú" placeholder="Ghi chú" value={a.note ?? ''} onCommit={(note) => patch({ note })} className={`${input} sm:col-span-2`} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={a.pinned ?? false} onChange={(e) => patch({ pinned: e.target.checked || undefined })} />
            Ghim tiêu chí đã chọn (bộ gợi ý không được đổi)
          </label>
        </div>
      )}
    </li>
  )
}

interface CommitInputProps {
  value: string
  onCommit: (value: string) => void
  multiline?: boolean
  required?: boolean
  type?: string
  placeholder?: string
  className?: string
  'aria-label': string
}

/** Ô nhập chỉ ghi khi rời ô (hoặc Enter): mỗi lần sửa là một bước undo, không phải mỗi phím. */
function CommitInput({ value, onCommit, multiline, required, ...rest }: CommitInputProps) {
  const commit = (el: HTMLInputElement | HTMLTextAreaElement) => {
    const next = el.value.trim()
    if (required && !next) el.value = value
    else if (next !== value) onCommit(next)
  }
  const common = {
    defaultValue: value,
    onBlur: (e: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => commit(e.currentTarget),
    ...rest,
  }
  // key theo value để undo/redo cập nhật lại ô nhập
  return multiline ? (
    <textarea key={value} rows={2} {...common} />
  ) : (
    <input key={value} {...common} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  )
}
