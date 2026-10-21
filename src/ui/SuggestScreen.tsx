// Màn hình "Gợi ý" (SPEC mục 7.4, docs/DESIGN.md mục 4.3): kết quả tối ưu dạng "đổi X → Y: +N điểm",
// áp dụng tất cả / từng dòng, và các nhóm còn lấy được điểm gom theo mục.

import { useEffect, useMemo, useState } from 'react'
import { applyChanges, openCategories, optimize, type Change, type OptimizeResult } from '../domain/optimizer.ts'
import { resolveRubric, rubricIndex } from '../domain/rubric.ts'
import type { Activity, UserData } from '../domain/types.ts'
import { formatGain } from './format.ts'
import { Button, StatusIcon } from './kit/index.ts'
import type { Notify } from './notify.ts'
import { SCENARIO_META, STATUS_META, TONE } from './status.ts'

interface Props {
  data: UserData
  /** Đang hiển thị: chỉ tính lại khi người dùng nhìn thấy màn hình này. */
  active: boolean
  onEdit: (recipe: (d: UserData) => UserData) => void
  notify: Notify
}

type Run = { data: UserData; res: OptimizeResult }

const CRITERIA_SHOWN = 3

export function SuggestScreen({ data, active, onEdit, notify }: Props) {
  const rubric = resolveRubric(data)
  const index = rubricIndex(rubric)
  const name = (id: string | null) => (id === null ? '' : (index.get(id)?.node.name ?? 'Không có trong rubric'))
  const [run, setRun] = useState<Run | null>(null)
  const [computing, setComputing] = useState(false)

  const compute = (d: UserData) => {
    setComputing(true)
    // nhường một khung hình để hiện "Đang tính…" trước khi chạy (đồng bộ, tối đa vài trăm ms)
    setTimeout(() => {
      setRun({ data: d, res: optimize(resolveRubric(d), d) })
      setComputing(false)
    }, 0)
  }
  // Tự tính khi mở màn hình và mỗi khi dữ liệu đổi trong lúc đang xem (Q5 trong DESIGN.md).
  useEffect(() => {
    if (active && run?.data !== data && !computing) compute(data)
  }, [active, data]) // chỉ phản ứng khi mở màn hình hoặc dữ liệu đổi

  const res = run?.data === data ? run.res : null
  const cats = useMemo(() => openCategories(rubric, data), [rubric, data])
  const activity = (id: string) => data.activities.find((a) => a.id === id)!

  const apply = (changes: Change[]) => {
    onEdit((d) => applyChanges(d, changes))
    notify(changes.length === 1 ? `Đã đổi tiêu chí cho “${activity(changes[0]!.activityId).name}”` : `Đã áp dụng ${changes.length} thay đổi`, {
      undo: true,
    })
  }

  return (
    <main className="mx-auto max-w-[960px] space-y-12 px-4 pt-8 pb-24 sm:px-8">
      <section aria-labelledby="goi-y" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 id="goi-y" className="text-title">
              Gợi ý gán tiêu chí
            </h1>
            <p className="mt-1 text-small text-fg-muted">Đổi tiêu chí cho các hoạt động chưa xác nhận để được nhiều điểm nhất.</p>
          </div>
          <Button onClick={() => compute(data)} disabled={computing}>
            {computing ? 'Đang tính…' : 'Tính lại'}
          </Button>
        </div>

        <details className="group text-small text-fg-muted">
          <summary className="inline-flex min-h-11 list-none items-center gap-1.5 text-fg-subtle hover:text-fg sm:min-h-0 [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="transition-transform group-open:rotate-90">
              ▸
            </span>
            Cách tính
          </summary>
          <p className="mt-2 max-w-prose">
            Ưu tiên điểm "{SCENARIO_META.projected.long}", rồi đến điểm "{SCENARIO_META.done.long}", rồi đổi ít nhất có thể.
            Hoạt động đã xác nhận, đã ghim hoặc không được thì giữ nguyên; tiêu chí đã đánh dấu không đạt thì bỏ qua. Điểm
            ghi ở mỗi dòng là điểm tăng thêm nếu chỉ áp dụng riêng dòng đó.
          </p>
        </details>

        {res === null ? (
          <p className="text-body text-fg-subtle">Đang tính…</p>
        ) : (
          <Result res={res} name={name} activity={activity} onApply={apply} />
        )}
      </section>

      <section aria-labelledby="nen-tim">
        <h2 id="nen-tim" className="text-heading">
          Nên tìm thêm hoạt động ở đâu
        </h2>
        <p className="mt-1 max-w-prose text-small text-fg-muted">
          Số điểm còn lấy được nếu làm hết dự định. Các nhóm trong cùng một mục dùng chung phần còn lại của mục, nên không
          cộng dồn.
        </p>
        {cats.length === 0 ? (
          <p className="mt-4 text-body">Không còn nhóm nào lấy thêm được điểm.</p>
        ) : (
          <ul className="mt-4 border-t border-border">
            {cats.map((c) => (
              <li key={c.categoryId} data-category={c.categoryId} className="border-b border-border py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-heading">
                    <span className="mr-1.5 text-xs font-medium text-fg-subtle">{c.categoryId}</span>
                    {index.get(c.categoryId)!.node.name}
                  </h3>
                  <span className="shrink-0 text-small whitespace-nowrap text-fg-muted">
                    còn tối đa <span className="text-body font-semibold text-fg tabular-nums">{c.room}</span>
                  </span>
                </div>
                <ul className="mt-3 space-y-4 sm:ml-7">
                  {c.groups.map((g) => (
                    <OpenGroupItem key={g.groupId} group={g} groupName={name(g.groupId)} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

// ---------- Kết quả tối ưu ----------

interface ResultProps {
  res: OptimizeResult
  name: (id: string | null) => string
  activity: (id: string) => Activity
  onApply: (changes: Change[]) => void
}

function Result({ res, name, activity, onApply }: ResultProps) {
  const greedy = res.method === 'greedy' && (
    <p role="status" className="text-small text-fg-muted">
      <span aria-hidden className={TONE.planned.fg}>
        ⚠
      </span>{' '}
      Có quá nhiều cách gán nên đã dừng sau {res.nodes.toLocaleString('vi-VN')} bước và dùng cách tính gần đúng. Kết quả
      không tệ hơn hiện tại nhưng có thể chưa phải tốt nhất.
    </p>
  )

  if (res.changes.length === 0)
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-body">
          <span aria-hidden className={`text-heading ${TONE.confirmed.fg}`}>
            ✓
          </span>
          {Object.keys(res.assignment).length === 0
            ? 'Chưa có hoạt động nào để gợi ý: chỉ hoạt động dự định hoặc đã tham gia (chưa ghim) mới được đổi tiêu chí.'
            : 'Cách gán hiện tại đã tốt nhất. Không cần đổi gì.'}
        </p>
        {greedy}
      </div>
    )

  // Chỉ nhắc kịch bản có đổi; mỗi số chỉ xuất hiện một lần.
  const deltas = (['projected', 'done'] as const)
    .filter((k) => res.after[k] !== res.before[k])
    .map((k) => `${formatGain(res.after[k] - res.before[k])} ${SCENARIO_META[k].long.toLowerCase()} (${res.before[k]} → ${res.after[k]})`)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body">
          <span className="font-semibold">
            Áp dụng {res.changes.length} thay đổi
            {deltas.length > 0 && ':'}
          </span>{' '}
          {deltas.join(' · ')}
        </p>
        <Button variant="primary" onClick={() => onApply(res.changes)}>
          Áp dụng tất cả
        </Button>
      </div>
      {greedy}
      <ul className="border-t border-border">
        {res.changes.map((c) => (
          <ChangeRow key={c.activityId} change={c} activity={activity(c.activityId)} name={name} onApply={() => onApply([c])} />
        ))}
      </ul>
    </div>
  )
}

function ChangeRow({ change: c, activity: a, name, onApply }: { change: Change; activity: Activity; name: (id: string | null) => string; onApply: () => void }) {
  const verb = c.from === null ? 'Chọn' : c.to === null ? 'Bỏ' : 'Đổi'
  return (
    <li data-change={c.activityId} className="flex items-start gap-3 border-b border-border py-3">
      <span className="pt-px">
        <StatusIcon tone={a.status} icon={STATUS_META[a.status].icon} label={STATUS_META[a.status].label} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{a.name}</div>
        <div className="mt-0.5 text-body">
          {verb}{' '}
          {c.from !== null && (
            <span title={name(c.from)} className="text-fg-subtle line-through decoration-fg-disabled">
              {c.from}
            </span>
          )}
          {c.from !== null && c.to !== null && <span aria-label="thành"> → </span>}
          {c.to !== null && (
            <span title={name(c.to)} className="font-medium">
              {c.to}
            </span>
          )}
          :{' '}
          <span className={c.gain > 0 ? `font-semibold ${TONE.confirmed.fg}` : 'text-fg-subtle'}>{formatGain(c.gain)} điểm</span>
          {c.gain <= 0 && <span className="text-small text-fg-subtle"> (cần đi cùng dòng khác)</span>}
        </div>
        {c.to !== null && <div className="mt-0.5 text-small text-fg-muted">{name(c.to)}</div>}
      </div>
      <Button onClick={onApply} className="shrink-0">
        Áp dụng
      </Button>
    </li>
  )
}

// ---------- Nhóm còn trống ----------

function OpenGroupItem({ group: g, groupName }: { group: ReturnType<typeof openCategories>[number]['groups'][number]; groupName: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? g.criteria : g.criteria.slice(0, CRITERIA_SHOWN)
  const hidden = g.criteria.length - shown.length
  return (
    <li data-group={g.groupId}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body font-medium">
          <span className="mr-1.5 text-xs text-fg-subtle">{g.groupId}</span>
          {groupName}
        </span>
        <span className="shrink-0 text-small text-fg-muted tabular-nums">còn {g.room}</span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {shown.map((c) => {
          const got = Math.min(c.points, g.room)
          return (
            <li key={c.id} className="flex gap-3 text-small text-fg-muted">
              <span className="w-8 shrink-0 text-right font-medium text-fg tabular-nums">+{got}</span>
              <span className="min-w-0">
                <span className="mr-1.5 text-xs text-fg-subtle">{c.id}</span>
                {c.name}
                {got < c.points && <span className="text-fg-subtle"> (tiêu chí +{c.points}, chỉ còn lấy được {g.room})</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <button type="button" onClick={() => setAll(true)} className="mt-1 ml-11 min-h-11 text-small text-fg-subtle hover:text-fg sm:min-h-0">
          + {hidden} tiêu chí khác
        </button>
      )}
    </li>
  )
}
