// Màn hình "Trạng thái ĐRL" (SPEC mục 7.2). Chỉ đọc, ngoại trừ bật/tắt loại trừ tiêu chí.

import { useMemo, useState } from 'react'
import { gradeOf, nextGrade } from '../domain/grading.ts'
import { criterionInfo, fullAt, scoreNodes, type CriterionInfo } from '../domain/overview.ts'
import { resolveRubric } from '../domain/rubric.ts'
import { computeScenarios, SCENARIO_KEYS, SCENARIOS, type ScenarioKey } from '../domain/scoring.ts'
import type { Category, Criterion, Group, UserData } from '../domain/types.ts'
import { Badge, Button, Card, ProgressBar, StatusBadge } from './kit/index.ts'
import { SCENARIO_META } from './status.ts'

interface Props {
  data: UserData
  onToggleExcluded: (criterionId: string) => void
  onAddActivity: () => void
}

type Values = Record<ScenarioKey, number>

const FULL_TITLE: Record<ScenarioKey, string> = {
  confirmed: 'Đã đầy với các hoạt động đã được xác nhận',
  done: 'Sẽ đầy khi các hoạt động đã tham gia được xác nhận',
  projected: 'Sẽ đầy nếu làm hết kế hoạch',
}

export function StatusScreen({ data, onToggleExcluded, onAddActivity }: Props) {
  const rubric = resolveRubric(data)
  const scores = useMemo(() => computeScenarios(rubric, data), [rubric, data])
  const nodes = useMemo(() => scoreNodes(scores), [scores])
  const info = useMemo(() => criterionInfo(rubric, data), [rubric, data])
  const [hideFull, setHideFull] = useState(false)
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const values = (id: string): Values => ({
    confirmed: nodes.confirmed.get(id)?.capped ?? 0,
    done: nodes.done.get(id)?.capped ?? 0,
    projected: nodes.projected.get(id)?.capped ?? 0,
  })
  const wasted = (id: string) => nodes.projected.get(id)?.wasted ?? 0
  const isOpen = (c: Criterion) => {
    const i = info.get(c.id)!
    return i.best === null && !i.excluded
  }
  const visibleCriteria = (g: Group) => (onlyOpen ? g.criteria.filter(isOpen) : g.criteria)
  const visibleGroups = (cat: Category) =>
    cat.groups.filter((g) => !(hideFull && fullAt(nodes, g.id) !== null) && visibleCriteria(g).length > 0)

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      {data.activities.length === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface p-4 text-sm text-fg-muted">
          <span>
            Chưa có hoạt động nào. Thêm hoạt động đã làm hoặc định làm để xem điểm. Tiêu chí nào biết chắc không đạt
            được thì bấm vào nó ở cây chi tiết bên dưới để đánh dấu loại trừ.
          </span>
          <Button variant="primary" onClick={onAddActivity}>
            Thêm hoạt động
          </Button>
        </div>
      )}

      {/* ---- Thẻ tổng ---- */}
      <section aria-labelledby="tong-diem">
        <h2 id="tong-diem" className="sr-only">
          Tổng điểm
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SCENARIO_KEYS.map((k) => {
            const score = scores[k].capped
            const next = nextGrade(score)
            return (
              <Card key={k} data-scenario={k}>
                <div className={`text-sm font-medium ${SCENARIO_META[k].text}`}>
                  <span aria-hidden>{SCENARIO_META[k].icon}</span> {SCENARIOS[k].label}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span data-testid="total" className="text-4xl font-semibold tabular-nums">
                    {score}
                  </span>
                  <span className="text-fg-subtle">/ {rubric.totalMax}</span>
                  <Badge className="ml-auto">{gradeOf(score).label}</Badge>
                </div>
                <div className="mt-1 text-sm text-fg-subtle">
                  {next ? `Còn ${next.gap} điểm nữa lên ${next.grade.label}` : 'Đã đạt mức cao nhất'}
                </div>
              </Card>
            )
          })}
        </div>
        <ProgressBar values={values('total')} max={rubric.totalMax} size="md" className="mt-3" />
        <Legend />
      </section>

      {/* ---- Bảng theo mục lớn ---- */}
      <section aria-labelledby="theo-muc">
        <h2 id="theo-muc" className="mb-2 text-heading">
          Theo mục
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong text-left text-fg-subtle">
              <th className="py-1.5 font-normal">Mục</th>
              {SCENARIO_KEYS.map((k) => (
                <th key={k} className={`w-10 whitespace-nowrap py-1.5 pl-2 text-right font-normal sm:w-32 ${SCENARIO_META[k].text}`} title={SCENARIOS[k].label}>
                  <span aria-hidden>{SCENARIO_META[k].icon}</span>
                  <span className="sr-only sm:not-sr-only"> {SCENARIO_META[k].short}</span>
                </th>
              ))}
              <th className="w-10 py-1.5 text-right font-normal sm:w-14">Max</th>
              <th className="hidden w-20 py-1.5 text-right font-normal sm:table-cell">Còn trống</th>
            </tr>
          </thead>
          <tbody>
            {rubric.categories.map((cat) => {
              const v = values(cat.id)
              const penalty = cat.kind === 'penalty'
              return (
                <tr key={cat.id} data-node={cat.id} className="border-b border-border align-top">
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => {
                        const el = document.getElementById(`muc-${cat.id}`) as HTMLDetailsElement | null
                        if (el) {
                          el.open = true
                          el.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                    >
                      <span className="font-mono">{cat.id}</span>. {cat.name}
                    </button>
                    <ProgressBar values={v} max={cat.max} penalty={penalty} className="mt-1.5" />
                  </td>
                  {SCENARIO_KEYS.map((k) => (
                    <td key={k} data-scenario={k} className="py-2 text-right tabular-nums">
                      {v[k]}
                    </td>
                  ))}
                  <td className="py-2 text-right tabular-nums text-fg-subtle">{cat.max}</td>
                  <td className="hidden py-2 text-right tabular-nums sm:table-cell">{penalty ? '—' : cat.max - v.projected}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* ---- Cây chi tiết ---- */}
      <section aria-labelledby="chi-tiet">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <h2 id="chi-tiet" className="text-heading">
            Chi tiết
          </h2>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={hideFull} onChange={(e) => setHideFull(e.target.checked)} />
            Ẩn nhóm đã đầy
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Chỉ hiện tiêu chí còn trống
          </label>
        </div>

        <div className="space-y-6">
          {rubric.categories.map((cat) => {
            const groups = visibleGroups(cat)
            const penalty = cat.kind === 'penalty'
            return (
              <details key={cat.id} id={`muc-${cat.id}`} open className="group/cat scroll-mt-28">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="inline-block w-3 text-fg-subtle transition-transform group-open/cat:rotate-90">
                    ▸
                  </span>
                  <h3 className="font-semibold">
                    <span className="font-mono">{cat.id}</span>. {cat.name}
                  </h3>
                  <Trio values={values(cat.id)} max={cat.max} />
                  {!penalty && <Tags at={fullAt(nodes, cat.id)} wasted={wasted(cat.id)} />}
                </summary>
                {groups.length === 0 ? (
                  <p className="mt-2 text-sm text-fg-subtle">Không có nhóm nào khớp bộ lọc.</p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {groups.map((g) => (
                      <Card key={g.id} data-node={g.id} padding="none" className="overflow-hidden">
                        <div className="border-b border-border px-3 py-2">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h4 className="text-sm font-medium">
                              <span className="font-mono">{g.id}</span> {g.name}
                            </h4>
                            <Trio values={values(g.id)} max={g.max} />
                            {!penalty && <Tags at={fullAt(nodes, g.id)} wasted={wasted(g.id)} />}
                          </div>
                          <ProgressBar values={values(g.id)} max={g.max} penalty={penalty} className="mt-1.5" />
                        </div>
                        <ul className="divide-y divide-border">
                          {visibleCriteria(g).map((c) => (
                            <CriterionRow
                              key={c.id}
                              criterion={c}
                              info={info.get(c.id)!}
                              superseded={(nodes.projected.get(c.id)?.wasted ?? 0) !== 0}
                              open={openId === c.id}
                              onToggleOpen={() => setOpenId(openId === c.id ? null : c.id)}
                              onToggleExcluded={() => onToggleExcluded(c.id)}
                            />
                          ))}
                        </ul>
                      </Card>
                    ))}
                  </div>
                )}
              </details>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function Legend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
      {SCENARIO_KEYS.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span aria-hidden className={`inline-block h-2 w-5 rounded-sm ${SCENARIO_META[k].bar}`} />
          {SCENARIO_META[k].icon} {k === 'confirmed' ? 'Đã xác nhận' : k === 'done' ? 'Đã tham gia, chờ xác nhận' : 'Dự định'}
        </li>
      ))}
    </ul>
  )
}

/** "✓ 10 ◐ 16 ○ 16 / 25" — ba kịch bản kèm icon, không chỉ dựa vào màu. */
function Trio({ values, max }: { values: Values; max: number }) {
  return (
    <span className="flex items-baseline gap-2 text-sm tabular-nums">
      {SCENARIO_KEYS.map((k) => (
        <span key={k} data-scenario={k} className={SCENARIO_META[k].text} title={SCENARIOS[k].label}>
          <span aria-hidden>{SCENARIO_META[k].icon}</span>
          <span className="sr-only">{SCENARIOS[k].label}:</span> {values[k]}
        </span>
      ))}
      <span className="text-fg-subtle">/ {max}</span>
    </span>
  )
}

function Tags({ at, wasted }: { at: ScenarioKey | null; wasted: number }) {
  return (
    <>
      {at && (
        <Badge tone={SCENARIO_META[at].tone} icon={SCENARIO_META[at].icon} title={FULL_TITLE[at]}>
          Đầy<span className="sr-only">: {FULL_TITLE[at]}</span>
        </Badge>
      )}
      {wasted > 0 && (
        <Badge icon="⚠" title="Tổng điểm các tiêu chí vượt trần (nếu làm hết kế hoạch). Nên chuyển bớt hoạt động sang nhóm khác.">
          phí {wasted} điểm
        </Badge>
      )}
    </>
  )
}

const BORDER = {
  confirmed: 'border-l-confirmed-bar',
  joined: 'border-l-joined-bar',
  planned: 'border-l-planned-bar',
  rejected: 'border-l-transparent',
  excluded: 'border-l-rejected-bar',
  none: 'border-l-transparent',
}

interface RowProps {
  criterion: Criterion
  info: CriterionInfo
  /** Được chọn nhưng không được tính vì đã có mức loại trừ cao hơn. */
  superseded: boolean
  open: boolean
  onToggleOpen: () => void
  onToggleExcluded: () => void
}

function CriterionRow({ criterion: c, info, superseded, open, onToggleOpen, onToggleExcluded }: RowProps) {
  const state = info.excluded ? 'excluded' : (info.best ?? 'none')
  const detailId = `tc-${c.id}`
  return (
    <li data-node={c.id} data-state={state}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={onToggleOpen}
        className={`flex w-full items-start gap-2 border-l-4 px-3 py-2 text-left hover:bg-surface ${BORDER[state]}`}
      >
        <StateChip state={state} />
        <span className="min-w-0 flex-1">
          <span className="text-sm">
            <span className="font-mono text-fg-subtle">{c.id}</span> {c.name}
          </span>
          {(info.chosenBy.length > 0 || info.elsewhere.length > 0 || superseded) && (
            <span className="mt-0.5 block text-xs text-fg-muted">
              {info.chosenBy.length > 0 && <>← {info.chosenBy.map((a) => a.name).join(', ')}</>}
              {info.chosenBy.length > 1 && <> (trùng, chỉ tính 1 lần)</>}
              {superseded && <> · không tính vì đã có mức cao hơn</>}
              {info.chosenBy.length > 0 && info.elsewhere.length > 0 && ' · '}
              {info.elsewhere.length > 0 && <>{info.elsewhere.length} hoạt động khác có thể dùng</>}
            </span>
          )}
        </span>
        <span className={`shrink-0 text-sm tabular-nums ${info.excluded ? 'text-fg-subtle line-through' : ''}`}>
          {c.points > 0 ? `+${c.points}` : `−${-c.points}`}
        </span>
      </button>
      {open && <CriterionDetail id={detailId} info={info} onToggleExcluded={onToggleExcluded} />}
    </li>
  )
}

function StateChip({ state }: { state: keyof typeof BORDER }) {
  if (state === 'excluded')
    return (
      <Badge tone="rejected" icon="✕" className="mt-0.5">
        Loại trừ
      </Badge>
    )
  if (state === 'none' || state === 'rejected')
    return (
      <Badge icon="·" className="mt-0.5">
        Trống
      </Badge>
    )
  return <StatusBadge status={state} className="mt-0.5" />
}

function CriterionDetail({ id, info, onToggleExcluded }: { id: string; info: CriterionInfo; onToggleExcluded: () => void }) {
  return (
    <div id={id} className="space-y-2 bg-surface px-3 py-3 pl-6 text-sm">
      {info.eligible.length === 0 ? (
        <p className="text-fg-subtle">Chưa có hoạt động nào có thể dùng tiêu chí này.</p>
      ) : (
        <div>
          <div className="text-fg-subtle">Hoạt động có thể dùng:</div>
          <ul className="mt-1 space-y-1">
            {info.eligible.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={a.status} />
                <span>{a.name}</span>
                <span className="text-xs text-fg-subtle">
                  {a.chosen === null ? 'chưa chọn tiêu chí' : info.chosenBy.includes(a) ? 'đang chọn tiêu chí này' : `đang chọn ${a.chosen}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {info.excluded ? (
          <Button size="sm" onClick={onToggleExcluded}>
            Bỏ loại trừ
          </Button>
        ) : info.excludedOverridden ? (
          <>
            <span className="text-fg-muted">
              Tiêu chí này nằm trong danh sách loại trừ nhưng đang được chọn nên vẫn được tính.
            </span>
            <Button size="sm" onClick={onToggleExcluded}>
              Bỏ khỏi danh sách loại trừ
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={onToggleExcluded} disabled={info.chosenBy.length > 0}>
              ✕ Đánh dấu không đạt được
            </Button>
            {info.chosenBy.length > 0 && (
              <span className="text-fg-subtle">Đang có hoạt động chọn tiêu chí này.</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
