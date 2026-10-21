// Màn hình "Gợi ý" (SPEC mục 7.4): tối ưu cách gán tiêu chí, bảng diff, áp dụng tất cả / từng dòng, nhóm còn trống.

import { useEffect, useMemo, useState } from 'react'
import { applyChanges, openGroups, optimize, type Change, type OptimizeResult } from '../domain/optimizer.ts'
import { resolveRubric, rubricIndex } from '../domain/rubric.ts'
import { SCENARIO_KEYS, SCENARIOS } from '../domain/scoring.ts'
import type { UserData } from '../domain/types.ts'
import { formatGain } from './format.ts'
import { Badge, Button, Card, StatusBadge } from './kit/index.ts'
import { SCENARIO_META, TONE } from './status.ts'

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
          <h2 id="goi-y" className="text-heading">
            Gợi ý cách gán tiêu chí
          </h2>
          <Button variant="primary" onClick={() => run(data)} disabled={computing}>
            {computing ? 'Đang tính…' : result ? 'Tính lại' : 'Tính gợi ý'}
          </Button>
        </div>
        <p className="text-sm text-fg-muted">
          Tìm cách gán tiêu chí cho các hoạt động dự định và đã tham gia để điểm "Nếu làm hết kế hoạch" cao nhất, rồi đến
          điểm "Nếu đã tham gia được tính", và đổi ít nhất có thể. Hoạt động đã xác nhận, đã ghim hoặc không được thì
          giữ nguyên; tiêu chí bị loại trừ thì bỏ qua.
        </p>

        {fresh && <Result res={fresh} name={name} activity={activity} onEdit={onEdit} />}
      </section>

      <section aria-labelledby="nhom-trong">
        <h2 id="nhom-trong" className="text-heading">
          Nhóm còn trống
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Các nhóm còn lấy được nhiều điểm nhất nếu làm hết kế hoạch (đã tính trần nhóm, trần mục và tổng), kèm các tiêu
          chí còn trống ít điểm nhất — gợi ý loại hoạt động nên tìm tiếp.
        </p>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm">Không còn nhóm nào trống.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {groups.slice(0, OPEN_GROUPS_SHOWN).map((g) => (
              <Card as="li" key={g.groupId} data-group={g.groupId} padding="sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">
                    <span className="font-mono">{g.groupId}</span> {index.get(g.groupId)!.node.name}
                  </span>
                  <Badge className="ml-auto">còn {g.room} điểm</Badge>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-fg-muted">
                  {g.criteria.slice(0, CRITERIA_PER_GROUP).map((c) => (
                    <li key={c.id} className="flex gap-2">
                      <span className="shrink-0 tabular-nums">+{Math.min(c.points, g.room)}</span>
                      <span>
                        <span className="font-mono">{c.id}</span> {c.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
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
        <p role="status" className="text-sm text-fg-muted">
          <span aria-hidden className={TONE.planned.fg}>
            ⚠
          </span>{' '}
          Có quá nhiều cách gán nên đã dừng sau {res.nodes.toLocaleString('vi-VN')} bước và dùng cách tính gần đúng. Kết
          quả không tệ hơn hiện tại nhưng có thể chưa phải tốt nhất.
        </p>
      )}

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SCENARIO_KEYS.map((k) => {
          const diff = res.after[k] - res.before[k]
          return (
            <Card key={k} data-scenario={k} padding="sm">
              <dt className={`text-sm ${SCENARIO_META[k].text}`}>
                <span aria-hidden>{SCENARIO_META[k].icon}</span> {SCENARIOS[k].label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {res.before[k]} → {res.after[k]}
                {diff !== 0 && <span className={`ml-2 text-base ${TONE.confirmed.fg}`}>({formatGain(diff)})</span>}
              </dd>
            </Card>
          )
        })}
      </dl>

      {Object.keys(res.assignment).length === 0 ? (
        <p className="rounded-md bg-surface p-3 text-sm text-fg-muted">
          Chưa có hoạt động nào để gợi ý. Chỉ hoạt động dự định hoặc đã tham gia (chưa ghim) mới được đổi tiêu chí; thêm
          chúng ở màn hình Hoạt động.
        </p>
      ) : res.changes.length === 0 ? (
        <p className={`rounded-md p-3 text-sm ${TONE.confirmed.soft} ${TONE.confirmed.fg}`}>
          ✓ Cách gán hiện tại đã tốt nhất, không cần đổi gì.
        </p>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-medium">{res.changes.length} thay đổi đề xuất</h3>
            <Button variant="primary" onClick={() => apply(res.changes)}>
              Áp dụng tất cả
            </Button>
            <span className="text-xs text-fg-subtle">Áp dụng xong vẫn hoàn tác được (Ctrl+Z).</span>
          </div>
          <Card as="ul" padding="none" className="divide-y divide-border">
            {res.changes.map((c) => {
              const a = activity(c.activityId)
              return (
                <li key={c.activityId} data-change={c.activityId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
                  <div className="min-w-48 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={a.status} />
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
                    <span className={c.gain > 0 ? `font-medium ${TONE.confirmed.fg}` : 'text-fg-subtle'}>
                      {formatGain(c.gain)} điểm
                    </span>
                    {c.gain <= 0 && <div className="text-xs text-fg-subtle">cần đi cùng dòng khác</div>}
                  </div>
                  <Button onClick={() => apply([c])}>Áp dụng</Button>
                </li>
              )
            })}
          </Card>
        </div>
      )}
    </div>
  )
}

function Crit({ id, name, strong }: { id: string | null; name: string | null; strong?: boolean }) {
  if (id === null) return <span className="text-fg-subtle">— không chọn —</span>
  return (
    <span title={name ?? undefined}>
      <span className={`font-mono ${strong ? 'font-semibold' : 'text-fg-subtle line-through decoration-fg-disabled'}`}>{id}</span>
      <span className="hidden text-fg-subtle sm:inline"> {name && name.length > 40 ? `${name.slice(0, 40)}…` : name}</span>
    </span>
  )
}
