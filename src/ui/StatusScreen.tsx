// Màn hình "Trạng thái ĐRL" (SPEC mục 7.2, docs/DESIGN.md mục 4.1). Chỉ đọc, ngoại trừ bật/tắt loại trừ tiêu chí.

import { useMemo, useState } from 'react'
import { GRADES, gradeOf, nextGrade } from '../domain/grading.ts'
import { criterionInfo, fullAt, scoreNodes, type CriterionInfo } from '../domain/overview.ts'
import { resolveRubric } from '../domain/rubric.ts'
import { computeScenarios, type ScenarioKey, type ScenarioScores } from '../domain/scoring.ts'
import type { Category, Criterion, Group, UserData } from '../domain/types.ts'
import { Badge, Button, ProgressBar, Segmented, StatusIcon } from './kit/index.ts'
import { SCENARIO_META, STATUS_META } from './status.ts'

interface Props {
  data: UserData
  onToggleExcluded: (criterionId: string) => void
  onAddActivity: () => void
}

type Values = Record<ScenarioKey, number>
type Filter = 'all' | 'open'

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'open', label: 'Còn trống' },
] as const

const FULL_TITLE: Record<ScenarioKey, string> = {
  confirmed: 'Đã đầy với các hoạt động đã xác nhận',
  done: 'Sẽ đầy khi các hoạt động đã tham gia được xác nhận',
  projected: 'Sẽ đầy nếu làm hết dự định',
}

/**
 * Cột của dòng mục/nhóm: chevron · tên · thanh · số, để mắt dò được theo cột.
 * Trên điện thoại tên chiếm cả dòng, thanh và số xuống dòng dưới.
 */
const ROW_GRID =
  'grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-2 sm:grid-cols-[1rem_minmax(0,1fr)_10rem_auto] sm:items-start'
const NAME_CELL = 'col-[2/4] row-start-1 self-start sm:col-[2/3]'
const BAR_CELL = 'col-[2/3] row-start-2 sm:col-[3/4] sm:row-start-1'
const NUM_CELL = 'col-[3/4] row-start-2 sm:col-[4/5] sm:row-start-1'

/** Số có dấu trừ thật (−) cho mục trừ điểm. */
const fmt = (n: number) => (n < 0 ? `−${-n}` : `${n}`)

export function StatusScreen({ data, onToggleExcluded, onAddActivity }: Props) {
  const rubric = resolveRubric(data)
  const scores = useMemo(() => computeScenarios(rubric, data), [rubric, data])
  const nodes = useMemo(() => scoreNodes(scores), [scores])
  const info = useMemo(() => criterionInfo(rubric, data), [rubric, data])
  const [filter, setFilter] = useState<Filter>('all')
  /** Mục người dùng đã tự mở/đóng; mục còn lại theo mặc định (mở nếu còn trống điểm). */
  const [toggled, setToggled] = useState<Map<string, boolean>>(new Map())
  const [openId, setOpenId] = useState<string | null>(null)

  const values = (id: string): Values => ({
    confirmed: nodes.confirmed.get(id)?.capped ?? 0,
    done: nodes.done.get(id)?.capped ?? 0,
    projected: nodes.projected.get(id)?.capped ?? 0,
  })
  const wasted = (id: string) => nodes.projected.get(id)?.wasted ?? 0
  const hasRoom = (cat: Category) => {
    const v = values(cat.id).projected
    return cat.kind === 'penalty' ? v !== 0 : v < cat.max
  }
  const isOpen = (cat: Category) => toggled.get(cat.id) ?? hasRoom(cat)
  const toggle = (cat: Category) => setToggled(new Map(toggled).set(cat.id, !isOpen(cat)))

  const isEmpty = (c: Criterion) => {
    const i = info.get(c.id)!
    return i.best === null && !i.excluded
  }
  const visibleCriteria = (g: Group) => (filter === 'open' ? g.criteria.filter(isEmpty) : g.criteria)
  const visibleGroups = (cat: Category) =>
    cat.groups.filter((g) => !(filter === 'open' && fullAt(nodes, g.id) !== null) && visibleCriteria(g).length > 0)

  return (
    <main className="mx-auto max-w-[960px] space-y-12 px-4 py-8 sm:px-8">
      {data.activities.length === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface p-4 text-small text-fg-muted">
          <span className="min-w-0 flex-1">
            Chưa có hoạt động nào. Thêm hoạt động đã làm hoặc định làm để xem điểm. Tiêu chí nào biết chắc không đạt
            được thì bấm vào nó ở danh sách bên dưới để đánh dấu.
          </span>
          <Button variant="primary" onClick={onAddActivity}>
            Thêm hoạt động
          </Button>
        </div>
      )}

      <Summary scores={scores} totalMax={rubric.totalMax} values={values('total')} />

      <section aria-labelledby="theo-muc">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="theo-muc" className="text-heading">
            Theo mục
          </h2>
          <Segmented aria-label="Hiện tiêu chí" value={filter} options={FILTERS} onChange={setFilter} />
        </div>

        <ul className="border-t border-border">
          {rubric.categories.map((cat) => {
            const open = isOpen(cat)
            const penalty = cat.kind === 'penalty'
            const groups = visibleGroups(cat)
            return (
              <li key={cat.id} data-node={cat.id} className="border-b border-border">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`muc-${cat.id}`}
                  onClick={() => toggle(cat)}
                  className={`${ROW_GRID} rounded-md py-3 text-left hover:bg-surface`}
                >
                  <Chevron open={open} />
                  <NodeName id={cat.id} name={cat.name} level="category" full={penalty ? null : fullAt(nodes, cat.id)} wasted={penalty ? 0 : wasted(cat.id)} />
                  <ProgressBar values={values(cat.id)} max={cat.max} penalty={penalty} size="md" className={`${BAR_CELL} sm:mt-[7px]`} />
                  <Numbers values={values(cat.id)} max={cat.max} strong className={NUM_CELL} />
                </button>

                {open && (
                  <div id={`muc-${cat.id}`} className="pb-4">
                    {groups.length === 0 ? (
                      <p className="py-1 pl-9 text-small text-fg-subtle">
                        {filter === 'open' ? 'Không còn tiêu chí trống trong mục này.' : 'Mục này chưa có nhóm nào.'}
                      </p>
                    ) : (
                      groups.map((g) => (
                        <div key={g.id} data-node={g.id} className="mt-3 first:mt-0">
                          <div className={`${ROW_GRID} py-1.5`}>
                            <NodeName id={g.id} name={g.name} level="group" full={penalty ? null : fullAt(nodes, g.id)} wasted={penalty ? 0 : wasted(g.id)} />
                            <ProgressBar values={values(g.id)} max={g.max} penalty={penalty} size="xs" className={`${BAR_CELL} sm:mt-2`} />
                            <Numbers values={values(g.id)} max={g.max} className={NUM_CELL} />
                          </div>
                          <ul className="sm:ml-7">
                            {visibleCriteria(g).map((c) => (
                              <CriterionRow
                                key={c.id}
                                criterion={c}
                                info={info.get(c.id)!}
                                superseded={(nodes.projected.get(c.id)?.wasted ?? 0) !== 0}
                                dimEmpty={filter === 'all'}
                                open={openId === c.id}
                                onToggleOpen={() => setOpenId(openId === c.id ? null : c.id)}
                                onToggleExcluded={() => onToggleExcluded(c.id)}
                              />
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

// ---------- Tổng điểm ----------

function Swatch({ k }: { k: ScenarioKey }) {
  return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-sm ${SCENARIO_META[k].bar}`} />
}

/** Một số chính thật to (điểm hiện tại); hai kịch bản còn lại nhỏ bên cạnh, mỗi số chỉ một lần. */
function Summary({ scores, totalMax, values }: { scores: ScenarioScores; totalMax: number; values: Values }) {
  const score = scores.confirmed.capped
  const next = nextGrade(score)
  return (
    <section aria-labelledby="tong-diem" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
        <div data-scenario="confirmed">
          <h2 id="tong-diem" className="flex items-center gap-2 text-small font-medium text-fg-muted">
            <Swatch k="confirmed" />
            {SCENARIO_META.confirmed.long}
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span data-testid="total" className="text-display tabular-nums">
              {score}
            </span>
            <span className="text-title font-normal text-fg-subtle">/ {totalMax}</span>
            <Badge size="md" className="ml-1 self-center">
              {gradeOf(score).label}
            </Badge>
          </div>
          <p className="mt-1 text-small text-fg-muted">
            {next ? `Còn ${next.gap} điểm nữa lên ${next.grade.label}` : 'Đã đạt mức cao nhất'}
          </p>
        </div>

        <dl className="grid grid-cols-[auto_auto_auto] items-baseline gap-x-4 gap-y-2">
          {(['done', 'projected'] as const).map((k) => (
            <div key={k} data-scenario={k} className="contents">
              <dt className="flex items-center gap-2 text-small text-fg-muted">
                <Swatch k={k} />
                {SCENARIO_META[k].long}
              </dt>
              <dd className="text-right text-heading tabular-nums">{scores[k].capped}</dd>
              <dd className="text-small text-fg-muted">{gradeOf(scores[k].capped).label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <GradeScale values={values} max={totalMax} />
    </section>
  )
}

/** Thanh tổng có vạch ngưỡng xếp loại bên dưới. */
function GradeScale({ values, max }: { values: Values; max: number }) {
  const ticks = GRADES.filter((g) => g.min > 0 && g.min < max)
  const left = (n: number) => ({ left: `${(n / max) * 100}%` })
  return (
    <div>
      <div className="relative">
        <ProgressBar values={values} max={max} size="md" />
        {ticks.map((g) => (
          <span key={g.label} aria-hidden style={left(g.min)} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-canvas" />
        ))}
      </div>
      <div aria-hidden className="relative mt-1.5 h-4 text-xs text-fg-subtle">
        {ticks.map((g) => (
          <span key={g.label} style={left(g.min)} className="absolute -translate-x-1/2 whitespace-nowrap tabular-nums">
            {g.min}
            <span className="hidden sm:inline"> {g.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- Dòng mục / nhóm ----------

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`col-[1/2] row-start-1 mt-[3px] size-4 self-start text-fg-subtle transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface NodeNameProps {
  id: string
  name: string
  level: 'category' | 'group'
  full: ScenarioKey | null
  wasted: number
}

function NodeName({ id, name, level, full, wasted }: NodeNameProps) {
  return (
    <span className={`${NAME_CELL} ${level === 'category' ? 'text-heading' : 'text-body font-medium'}`}>
      <span className="mr-1.5 text-xs font-medium text-fg-subtle">{id}</span>
      {name}
      {full && (
        <span title={FULL_TITLE[full]} className="ml-2 text-xs font-normal whitespace-nowrap text-fg-subtle">
          · đầy<span className="sr-only">: {FULL_TITLE[full]}</span>
        </span>
      )}
      {wasted > 0 && (
        <span
          title="Tổng điểm các tiêu chí vượt trần (nếu làm hết dự định). Nên chuyển bớt hoạt động sang nhóm khác."
          className="ml-2 text-xs font-normal whitespace-nowrap text-fg-muted"
        >
          <span aria-hidden className={SCENARIO_META.projected.text}>
            ⚠
          </span>{' '}
          phí {wasted} điểm
        </span>
      )}
    </span>
  )
}

/** "10 /25 ◐+6 ○+3": điểm hiện tại, trần, rồi phần cộng thêm của từng kịch bản (bỏ trống nếu bằng 0). */
function Numbers({ values, max, strong, className = '' }: { values: Values; max: number; strong?: boolean; className?: string }) {
  return (
    <span className={`flex items-baseline justify-end tabular-nums ${className}`}>
      <span className={`w-7 text-right ${strong ? 'font-semibold' : 'font-medium'}`}>
        <span className="sr-only">{SCENARIO_META.confirmed.long} </span>
        {fmt(values.confirmed)}
      </span>
      <span className="w-9 pl-1 text-small text-fg-subtle">
        <span className="sr-only">trên </span>/{fmt(max)}
      </span>
      <Delta k="done" value={values.done - values.confirmed} />
      <Delta k="projected" value={values.projected - values.done} />
    </span>
  )
}

function Delta({ k, value }: { k: ScenarioKey; value: number }) {
  if (value === 0) return <span aria-hidden className="w-10 sm:w-11" />
  const m = SCENARIO_META[k]
  const text = `${value > 0 ? '+' : '−'}${Math.abs(value)}`
  return (
    <span title={`${text} ${m.delta}`} className={`w-10 text-right text-small font-medium sm:w-11 ${m.text}`}>
      <span aria-hidden className="mr-0.5 text-xs">
        {m.icon}
      </span>
      {text}
      <span className="sr-only"> {m.delta}</span>
    </span>
  )
}

// ---------- Dòng tiêu chí ----------

interface RowProps {
  criterion: Criterion
  info: CriterionInfo
  /** Được chọn nhưng không được tính vì đã có mức loại trừ cao hơn. */
  superseded: boolean
  /** Làm mờ tiêu chí chưa có hoạt động; tắt khi đang lọc "Còn trống" vì lúc đó chúng là nội dung chính. */
  dimEmpty: boolean
  open: boolean
  onToggleOpen: () => void
  onToggleExcluded: () => void
}

function CriterionRow({ criterion: c, info, superseded, dimEmpty, open, onToggleOpen, onToggleExcluded }: RowProps) {
  const state = info.excluded ? 'excluded' : (info.best ?? 'empty')
  const empty = state === 'empty' && dimEmpty
  const detailId = `tc-${c.id}`
  const notes = [
    info.chosenBy.length > 1 && 'trùng, chỉ tính 1 lần',
    superseded && 'không tính vì đã có mức cao hơn',
    info.elsewhere.length > 0 && `${info.elsewhere.length} hoạt động khác có thể dùng`,
  ].filter(Boolean)
  return (
    <li data-node={c.id} data-state={state}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={onToggleOpen}
        className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-surface sm:py-1.5"
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {state === 'excluded' ? (
            <StatusIcon tone="rejected" icon="✕" label="Đã đánh dấu không đạt" />
          ) : state !== 'empty' ? (
            <StatusIcon tone={state} icon={STATUS_META[state].icon} label={STATUS_META[state].label} />
          ) : null}
        </span>
        <span className={`hidden w-12 shrink-0 pt-0.5 text-xs sm:block ${empty ? 'text-fg-disabled' : 'text-fg-subtle'}`}>{c.id}</span>
        <span className="min-w-0 flex-1">
          <span className={`block ${empty || state === 'excluded' ? 'text-fg-subtle' : 'text-fg'}`}>
            <span className={`mr-1.5 text-xs sm:hidden ${empty ? 'text-fg-disabled' : 'text-fg-subtle'}`}>{c.id}</span>
            {c.name}
          </span>
          {info.chosenBy.length > 0 && (
            <span className="mt-0.5 block text-small text-fg-muted">{info.chosenBy.map((a) => a.name).join(', ')}</span>
          )}
          {notes.length > 0 && <span className="mt-0.5 block text-xs text-fg-subtle">{notes.join(' · ')}</span>}
        </span>
        <span
          className={`w-8 shrink-0 text-right tabular-nums ${
            empty ? 'text-fg-subtle' : state === 'excluded' || superseded ? 'text-fg-subtle line-through' : 'font-medium'
          }`}
        >
          {c.points > 0 ? `+${c.points}` : `−${-c.points}`}
        </span>
      </button>
      {open && <CriterionDetail id={detailId} info={info} onToggleExcluded={onToggleExcluded} />}
    </li>
  )
}

function CriterionDetail({ id, info, onToggleExcluded }: { id: string; info: CriterionInfo; onToggleExcluded: () => void }) {
  return (
    <div id={id} className="mx-2 mt-1 mb-2 space-y-3 rounded-md bg-surface p-3 text-small sm:ml-[6.25rem]">
      {info.eligible.length === 0 ? (
        <p className="text-fg-subtle">Chưa có hoạt động nào có thể dùng tiêu chí này.</p>
      ) : (
        <div>
          <div className="text-fg-subtle">Hoạt động có thể dùng</div>
          <ul className="mt-1.5 space-y-1.5">
            {info.eligible.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <StatusIcon tone={a.status} icon={STATUS_META[a.status].icon} label={STATUS_META[a.status].label} />
                <span className="text-fg">{a.name}</span>
                <span className="text-xs text-fg-subtle">
                  {a.chosen === null ? 'chưa chọn tiêu chí' : info.chosenBy.includes(a) ? 'đang dùng cho tiêu chí này' : `đang dùng cho ${a.chosen}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {info.excluded ? (
          <Button size="sm" onClick={onToggleExcluded}>
            Bỏ đánh dấu không đạt
          </Button>
        ) : info.excludedOverridden ? (
          <>
            <span className="text-fg-muted">Tiêu chí này nằm trong danh sách không đạt nhưng đang được chọn nên vẫn được tính.</span>
            <Button size="sm" onClick={onToggleExcluded}>
              Bỏ khỏi danh sách không đạt
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={onToggleExcluded} disabled={info.chosenBy.length > 0}>
              Đánh dấu không đạt
            </Button>
            {info.chosenBy.length > 0 && <span className="text-fg-subtle">Đang có hoạt động chọn tiêu chí này.</span>}
          </>
        )}
      </div>
    </div>
  )
}
