import { resolveRubric } from '../domain/rubric.ts'
import { computeScenarios, SCENARIO_KEYS, SCENARIOS } from '../domain/scoring.ts'
import type { UserData } from '../domain/types.ts'
import { btn, Dialog } from './Dialog.tsx'

export type ImportState =
  | { kind: 'error'; fileName: string; errors: string[] }
  | { kind: 'preview'; fileName: string; data: UserData }

const MAX_ERRORS = 20

interface Props {
  state: ImportState
  current: { data: UserData; dirty: boolean } | null
  /** Trình duyệt đã có bản nháp của học kỳ trong file (khác học kỳ đang mở). */
  hasOtherDraft: boolean
  onConfirm: (data: UserData) => void
  onClose: () => void
}

/** Báo lỗi file tải lên, hoặc xem trước trước khi thay thế dữ liệu (SPEC mục 8). */
export function ImportDialog({ state, current, hasOtherDraft, onConfirm, onClose }: Props) {
  if (state.kind === 'error') {
    const shown = state.errors.slice(0, MAX_ERRORS)
    const more = state.errors.length - shown.length
    return (
      <Dialog title={`Không đọc được file ${state.fileName}`} onClose={onClose}>
        <ul className="max-h-72 list-disc space-y-1 overflow-auto pl-5 font-mono text-sm text-red-700 dark:text-red-300">
          {shown.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        {more > 0 && <p className="mt-1 text-sm">… và {more} lỗi khác.</p>}
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Dữ liệu hiện tại không bị thay đổi.</p>
        <div className="mt-4 flex justify-end">
          <button type="button" className={btn.primary} onClick={onClose} autoFocus>
            Đóng
          </button>
        </div>
      </Dialog>
    )
  }

  const { data } = state
  const sameSemester = current?.data.semester === data.semester
  const cols = [{ title: 'File', data }, ...(current ? [{ title: `Đang mở`, data: current.data }] : [])].map((c) => ({
    ...c,
    rubric: resolveRubric(c.data).id,
    scores: computeScenarios(resolveRubric(c.data), c.data),
  }))
  const rows: [string, (c: (typeof cols)[number]) => string | number][] = [
    ['Học kỳ', (c) => c.data.semester],
    ['Rubric', (c) => c.rubric],
    ['Số hoạt động', (c) => c.data.activities.length],
    ...SCENARIO_KEYS.map((k): [string, (c: (typeof cols)[number]) => number] => [SCENARIOS[k].label, (c) => c.scores[k].capped]),
  ]

  return (
    <Dialog title={`Xem trước ${state.fileName}`} onClose={onClose}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left dark:border-slate-700">
            <th className="py-1 font-normal" />
            {cols.map((c) => (
              <th key={c.title} className="py-1 text-right font-medium">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, get]) => (
            <tr key={label} className="border-b border-slate-100 dark:border-slate-800">
              <td className="py-1 text-slate-600 dark:text-slate-400">{label}</td>
              {cols.map((c) => (
                <td key={c.title} className="py-1 text-right tabular-nums">
                  {get(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
        {current && sameSemester && (
          <p>
            Dữ liệu học kỳ {data.semester} đang mở sẽ bị thay thế
            {current.dirty && <strong className="text-amber-700 dark:text-amber-300">, kể cả các thay đổi chưa tải xuống</strong>}.
          </p>
        )}
        {current && !sameSemester && <p>Dữ liệu học kỳ {current.data.semester} đang mở vẫn được giữ trong bản nháp.</p>}
        {hasOtherDraft && <p>Bản nháp học kỳ {data.semester} có sẵn trong trình duyệt sẽ bị thay thế.</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={btn.secondary} onClick={onClose}>
          Huỷ
        </button>
        <button type="button" className={btn.primary} onClick={() => onConfirm(data)} autoFocus>
          {current && sameSemester ? 'Thay thế' : 'Mở'}
        </button>
      </div>
    </Dialog>
  )
}
