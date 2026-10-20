// Màn hình "Gợi ý" (SPEC mục 7.4): tối ưu cách gán tiêu chí, bảng diff, áp dụng tất cả / từng dòng, nhóm còn trống.

import { useEffect, useMemo, useState } from 'react'
import { applyChanges, openGroups, optimize, type Change, type OptimizeResult } from '../domain/optimizer.ts'
import { resolveRubric, rubricIndex } from '../domain/rubric.ts'
import { SCENARIO_KEYS, SCENARIOS } from '../domain/scoring.ts'
import type { UserData } from '../domain/types.ts'
import { formatGain } from './ChosenSelect.tsx'
import { btn } from './Dialog.tsx'
import { SCENARIO_META, STATUS_META } from './status.ts'

interface Props {
  data: UserData
  onEdit: (recipe: (d: UserData) => UserData) => void
}

type Run = { data: UserData; res: OptimizeResult }
/** Lần tính gần nhất, giữ qua các lần chuyển tab trong phiên (chỉ là cache của giá trị tính ra). */
let lastRun: Run | null = null

const OPEN_GROUPS_SHOWN = 8
const CRITERIA_PER_GROUP = 3

export function SuggestScreen({ data, onEdit }: Props) {
  const rubric = resolveRubric(data)
  const index = rubricIndex(rubric)
  const [result, setResultState] = useState<Run | null>(lastRun)
  const setResult = (r: Run) => {
    lastRun = r
    setResultState(r)
  }
  const [computing, setComputing] = useState(false)

  const run = (d: UserData) => {
    setComputing(true)
    // nhường một khung hình để hiện "Đang tính…" trước khi chạy (đồng bộ, tối đa vài trăm ms)
    setTimeout(() => {
      setResult({ data: d, res: optimize(resolveRubric(d), d) })
      setComputing(false)
    }, 0)
  }
  // Dữ liệu đổi (áp dụng một dòng, hoàn tác, sửa ở màn khác, quay lại tab) thì tính lại cho khớp.
  useEffect(() => {
    if (result && result.data !== data && !computing) run(data)
  }, [data])

  const groups = useMemo(() => openGroups(rubric, data), [rubric, data])
  const fresh = result?.data === data ? result.res : null
  const name = (id: string | null) => (id === null ? null : (index.get(id)?.node.name ?? 'không có trong rubric'))
  const activity = (id: string) => data.activities.find((a) => a.id === id)!

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <section aria-labelledby="goi-y" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="goi-y" className="font-semibold">
            Gợi ý cách gán tiêu chí
          </h2>
          <button type="button" className={btn.primary} onClick={() => run(data)} disabled={computing}>
            {computing ? 'Đang tính…' : result ? 'Tính lại' : 'Tính gợi ý'}
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tìm cách gán tiêu chí cho các hoạt động dự định và đã tham gia để điểm "Nếu làm hết kế hoạch" cao nhất, rồi đến
          điểm "Nếu đã tham gia được tính", và đổi ít nhất có thể. Hoạt động đã xác nhận, đã ghim hoặc không được thì
          giữ nguyên; tiêu chí bị loại trừ thì bỏ qua.
        </p>

        {fresh && <Result res={fresh} name={name} activity={activity} onEdit={onEdit} />}
      </section>

      <section aria-labelledby="nhom-trong">
        <h2 id="nhom-trong" className="font-semibold">
          Nhóm còn trống
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Các nhóm còn lấy được nhiều điểm nhất nếu làm hết kế hoạch (đã tính trần nhóm, trần mục và tổng), kèm các tiêu
          chí còn trống ít điểm nhất — gợi ý loại hoạt động nên tìm tiếp.
        </p>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm">Không còn nhóm nào trống.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {groups.slice(0, OPEN_GROUPS_SHOWN).map((g) => (
              <li key={g.groupId} data-group={g.groupId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">
                    <span className="font-mono">{g.groupId}</span> {index.get(g.groupId)!.node.name}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900 dark:bg-green-400/15 dark:text-green-200">
                    còn {g.room} điểm
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {g.criteria.slice(0, CRITERIA_PER_GROUP).map((c) => (
                    <li key={c.id} className="flex gap-2">
                      <span className="shrink-0 tabular-nums">+{Math.min(c.points, g.room)}</span>
                      <span>
                        <span className="font-mono">{c.id}</span> {c.name}
                      </span>
                    </li>
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

interface ResultProps {
  res: OptimizeResult
  name: (id: string | null) => string | null
  activity: (id: string) => UserData['activities'][number]
  onEdit: Props['onEdit']
}

function Result({ res, name, activity, onEdit }: ResultProps) {
  const apply = (changes: Change[]) => onEdit((d) => applyChanges(d, changes))
  return (
    <div className="space-y-4">
      {res.method === 'greedy' && (
        <p role="status" className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
          ⚠ Có quá nhiều cách gán nên đã dừng sau {res.nodes.toLocaleString('vi-VN')} bước và dùng cách tính gần đúng. Kết
          quả không tệ hơn hiện tại nhưng có thể chưa phải tốt nhất.
        </p>
      )}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SCENARIO_KEYS.map((k) => {
          const diff = res.after[k] - res.before[k]
          return (
            <div key={k} data-scenario={k} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <dt className={`text-sm ${SCENARIO_META[k].text}`}>
                <span aria-hidden>{SCENARIO_META[k].icon}</span> {SCENARIOS[k].label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {res.before[k]} → {res.after[k]}
                {diff !== 0 && <span className="ml-2 text-base text-green-700 dark:text-green-400">({formatGain(diff)})</span>}
              </dd>
            </div>
          )
        })}
      </dl>

      {res.changes.length === 0 ? (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-400/10 dark:text-green-200">
          ✓ Cách gán hiện tại đã tốt nhất, không cần đổi gì.
        </p>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-medium">{res.changes.length} thay đổi đề xuất</h3>
            <button type="button" className={btn.primary} onClick={() => apply(res.changes)}>
              Áp dụng tất cả
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">Áp dụng xong vẫn hoàn tác được (Ctrl+Z).</span>
          </div>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {res.changes.map((c) => {
              const a = activity(c.activityId)
              return (
                <li key={c.activityId} data-change={c.activityId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
                  <div className="min-w-48 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ring-1 ${STATUS_META[a.status].badge}`}>
                        {STATUS_META[a.status].icon} {STATUS_META[a.status].label}
                      </span>
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      <Crit id={c.from} name={name(c.from)} /> <span aria-label="đổi thành">→</span> <Crit id={c.to} name={name(c.to)} strong />
                    </div>
                  </div>
                  <div
                    className="w-28 text-right text-sm tabular-nums"
                    title="Điểm &quot;Nếu làm hết kế hoạch&quot; tăng thêm nếu chỉ áp dụng riêng dòng này"
                  >
                    <span className={c.gain > 0 ? 'font-medium text-green-700 dark:text-green-400' : 'text-slate-500'}>
                      {formatGain(c.gain)} điểm
                    </span>
                    {c.gain <= 0 && <div className="text-xs text-slate-500">cần đi cùng dòng khác</div>}
                  </div>
                  <button type="button" className={btn.secondary} onClick={() => apply([c])}>
                    Áp dụng
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function Crit({ id, name, strong }: { id: string | null; name: string | null; strong?: boolean }) {
  if (id === null) return <span className="text-slate-500">— không chọn —</span>
  return (
    <span title={name ?? undefined}>
      <span className={`font-mono ${strong ? 'font-semibold' : 'text-slate-500 line-through decoration-slate-400'}`}>{id}</span>
      <span className="hidden text-slate-500 sm:inline"> {name && name.length > 40 ? `${name.slice(0, 40)}…` : name}</span>
    </span>
  )
}
