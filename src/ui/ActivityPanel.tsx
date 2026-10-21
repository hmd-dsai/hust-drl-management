// Panel thêm / sửa hoạt động (SPEC mục 7.3, docs/DESIGN.md mục 4.2). Sửa trên bản nháp, bấm Lưu mới ghi:
// mỗi lần lưu là một bước undo.

import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { patchActivity, uniqueActivityId, upsertActivity } from '../domain/activities.ts'
import { bestChoice, rankChoices } from '../domain/optimizer.ts'
import { rubricIndex } from '../domain/rubric.ts'
import { STATUSES, type Activity, type Rubric, type Status, type UserData } from '../domain/types.ts'
import { CriterionPicker } from './CriterionPicker.tsx'
import { formatGain } from './format.ts'
import { Button, fieldClass, Sheet } from './kit/index.ts'
import { STATUS_META, TONE } from './status.ts'

type Recipe = (d: UserData) => UserData

interface Props {
  rubric: Rubric
  data: UserData
  excluded: ReadonlySet<string>
  /** Hoạt động đang sửa; `null` là thêm mới. */
  activity: Activity | null
  onEdit: (recipe: Recipe) => void
  onDelete: (activity: Activity) => void
  onClose: () => void
}

const NEW_ID = '__moi__'

export function ActivityPanel({ rubric, data, excluded, activity, onEdit, onDelete, onClose }: Props) {
  const editing = activity !== null
  const [name, setName] = useState(activity?.name ?? '')
  const [status, setStatus] = useState<Status>(activity?.status ?? 'planned')
  const [eligible, setEligible] = useState<string[]>(activity?.eligible ?? [])
  /** `undefined` = chưa tự chọn: dùng lựa chọn được nhiều điểm nhất. */
  const [picked, setPicked] = useState<string | null | undefined>(editing ? activity.chosen : undefined)
  const [extra, setExtra] = useState({ date: activity?.date ?? '', link: activity?.link ?? '', note: activity?.note ?? '' })
  const [pinned, setPinned] = useState(activity?.pinned ?? false)
  const [nameError, setNameError] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  const id = activity?.id ?? NEW_ID
  const stored = activity?.chosen ?? null
  // Gain tính so với lúc hoạt động chưa chọn gì, để mỗi lựa chọn hiện đúng số điểm nó mang lại.
  const base = useMemo(
    () => (editing ? { ...data, activities: data.activities.map((a) => (a.id === id ? { ...a, chosen: null } : a)) } : data),
    [data, editing, id],
  )
  const draft: Activity = { id, name: name.trim(), status, eligible, chosen: null }
  const choices = rankChoices(rubric, base, draft)
  const best = bestChoice(rubric, base, draft)
  const allowed = (c: string | null | undefined): c is string | null =>
    c === null || (c !== undefined && (choices.some((x) => x.criterionId === c) || c === stored))
  const chosen = allowed(picked) ? picked : best

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    const fields = {
      name: trimmed,
      status,
      eligible,
      chosen,
      pinned: pinned || undefined,
      date: extra.date.trim() || undefined,
      link: extra.link.trim() || undefined,
      note: extra.note.trim() || undefined,
    }
    onEdit((d) =>
      editing ? patchActivity(d, id, fields) : upsertActivity(d, stripEmpty({ id: uniqueActivityId(trimmed, d), ...fields })),
    )
    onClose()
  }

  return (
    <Sheet
      title={editing ? 'Sửa hoạt động' : 'Thêm hoạt động'}
      onClose={onClose}
      initialFocus={editing ? undefined : nameRef}
      footer={
        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="ghost" className="-ml-3 text-rejected-fg hover:text-rejected-fg" onClick={() => onDelete(activity)}>
              Xoá
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="submit" form={formId} variant="primary">
            {editing ? 'Lưu' : 'Thêm'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Tên hoạt động" htmlFor={`${formId}-ten`}>
          <input
            id={`${formId}-ten`}
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError(false)
            }}
            placeholder="Ví dụ: Hiến máu nhân đạo tháng 11"
            aria-invalid={nameError}
            aria-describedby={nameError ? `${formId}-ten-loi` : undefined}
            className={`${fieldClass} w-full`}
          />
          {nameError && (
            <p id={`${formId}-ten-loi`} className="mt-1 text-small text-rejected-fg">
              Cần nhập tên hoạt động.
            </p>
          )}
        </Field>

        <Field label="Tiêu chí có thể dùng" hint="Mọi tiêu chí mà nhà trường có thể tính cho hoạt động này.">
          <CriterionPicker rubric={rubric} selected={eligible} onChange={setEligible} excluded={excluded} />
        </Field>

        <Field label="Tính cho tiêu chí" hint="Mỗi hoạt động chỉ được tính cho một tiêu chí. Số bên phải là điểm nếu làm hết dự định.">
          <ChosenList rubric={rubric} choices={choices} stored={stored} value={chosen} onChange={setPicked} excluded={excluded} />
        </Field>

        <Field label="Trạng thái">
          <StatusPicker value={status} onChange={setStatus} />
        </Field>

        <div className="grid gap-x-3 gap-y-6 sm:grid-cols-[10rem_1fr]">
          <Field label="Ngày" htmlFor={`${formId}-ngay`}>
            <input
              id={`${formId}-ngay`}
              type="date"
              value={extra.date}
              onChange={(e) => setExtra({ ...extra, date: e.target.value })}
              className={`${fieldClass} w-full`}
            />
          </Field>
          <Field label="Link" htmlFor={`${formId}-link`}>
            <input
              id={`${formId}-link`}
              type="url"
              placeholder="https://"
              value={extra.link}
              onChange={(e) => setExtra({ ...extra, link: e.target.value })}
              className={`${fieldClass} w-full`}
            />
          </Field>
        </div>

        <Field label="Ghi chú" htmlFor={`${formId}-ghi-chu`}>
          <textarea
            id={`${formId}-ghi-chu`}
            rows={3}
            value={extra.note}
            onChange={(e) => setExtra({ ...extra, note: e.target.value })}
            className={`${fieldClass} w-full`}
          />
        </Field>

        <label className="flex items-start gap-2 text-body">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="mt-1" />
          <span>
            Ghim tiêu chí đã chọn
            <span className="block text-small text-fg-subtle">Màn hình Gợi ý sẽ không đổi tiêu chí của hoạt động này.</span>
          </span>
        </label>
      </form>
    </Sheet>
  )
}

/** Bỏ các trường tuỳ chọn rỗng để file JSON gọn. */
function stripEmpty(a: Activity): Activity {
  const out = { ...a }
  for (const k of Object.keys(out) as (keyof Activity)[]) if (out[k] === undefined) delete out[k]
  return out
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  const Label = htmlFor ? 'label' : 'div'
  return (
    <div>
      <Label htmlFor={htmlFor} className="block text-body font-medium">
        {label}
      </Label>
      {hint && <p className="text-small text-fg-subtle">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

/** Bốn trạng thái dạng nút chọn một. */
function StatusPicker({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label="Trạng thái" className="grid grid-cols-2 gap-2">
      {STATUSES.map((s) => (
        <label
          key={s}
          className={`relative flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-body has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
            value === s ? `border-transparent font-medium ${TONE[s].soft} ${TONE[s].fg}` : 'border-border-strong text-fg-muted hover:bg-surface'
          }`}
        >
          <input type="radio" name={name} value={s} checked={value === s} onChange={() => onChange(s)} className="sr-only" />
          <span aria-hidden className={TONE[s].fg}>
            {STATUS_META[s].icon}
          </span>
          {STATUS_META[s].label}
        </label>
      ))}
    </div>
  )
}

interface ChosenListProps {
  rubric: Rubric
  choices: { criterionId: string; gain: number }[]
  /** Tiêu chí đang lưu: vẫn hiện kể cả khi không còn nằm trong danh sách có thể dùng. */
  stored: string | null
  value: string | null
  onChange: (id: string | null) => void
  excluded: ReadonlySet<string>
}

/** Danh sách radio thay cho ô chọn: tên tiêu chí hiện đầy đủ, không bị cắt. */
function ChosenList({ rubric, choices, stored, value, onChange, excluded }: ChosenListProps) {
  const name = useId()
  const index = rubricIndex(rubric)
  if (choices.length === 0 && stored === null)
    return <p className="text-small text-fg-subtle">Chọn tiêu chí có thể dùng ở trên trước.</p>

  const outside = stored !== null && !choices.some((c) => c.criterionId === stored)
  const option = (id: string | null, body: ReactNode, right?: ReactNode) => (
    <label
      key={id ?? ''}
      className={`flex cursor-pointer items-start gap-3 px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus ${
        value === id ? 'bg-surface-selected' : 'hover:bg-surface'
      }`}
    >
      <input type="radio" name={name} checked={value === id} onChange={() => onChange(id)} className="mt-1 shrink-0" />
      <span className="min-w-0 flex-1">{body}</span>
      {right}
    </label>
  )
  return (
    <div role="radiogroup" aria-label="Tính cho tiêu chí" className="divide-y divide-border overflow-hidden rounded-md border border-border-strong">
      {choices.map((c) =>
        option(
          c.criterionId,
          <>
            <span className="mr-1.5 text-xs text-fg-subtle">{c.criterionId}</span>
            {index.get(c.criterionId)!.node.name}
            {excluded.has(c.criterionId) && <span className="mt-0.5 block text-xs text-rejected-fg">✕ đang đánh dấu không đạt</span>}
            {c.gain === 0 && <span className="mt-0.5 block text-xs text-fg-subtle">không thêm điểm: trùng hoạt động khác hoặc đã đầy</span>}
          </>,
          <span className={`shrink-0 tabular-nums ${c.gain > 0 ? `font-medium ${TONE.confirmed.fg}` : 'text-fg-subtle'}`}>
            {formatGain(c.gain)}
          </span>,
        ),
      )}
      {outside &&
        option(
          stored,
          <>
            <span className="mr-1.5 text-xs text-fg-subtle">{stored}</span>
            {index.get(stored)?.kind === 'criterion' ? index.get(stored)!.node.name : 'Không có trong rubric'}
            <span className="mt-0.5 block text-xs text-planned-fg">⚠ không nằm trong danh sách có thể dùng</span>
          </>,
        )}
      {option(null, <span className="text-fg-muted">Chưa chọn</span>)}
    </div>
  )
}
