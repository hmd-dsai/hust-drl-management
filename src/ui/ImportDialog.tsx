import { resolveRubric } from '../domain/rubric.ts'
import { computeScenarios, SCENARIO_KEYS, SCENARIOS } from '../domain/scoring.ts'
import type { UserData } from '../domain/types.ts'
import { Dialog } from './Dialog.tsx'
import { Button } from './kit/index.ts'

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
        <ul className="max-h-72 list-disc space-y-1 overflow-auto pl-5 font-mono text-sm text-rejected-fg">
          {shown.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        {more > 0 && <p className="mt-1 text-sm">… và {more} lỗi khác.</p>}
        <p className="mt-3 text-sm text-fg-muted">Dữ liệu hiện tại không bị thay đổi.</p>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={onClose} autoFocus>
            Đóng
          </Button>
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
          <tr className="border-b border-border-strong text-left">
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
            <tr key={label} className="border-b border-border">
              <td className="py-1 text-fg-muted">{label}</td>
              {cols.map((c) => (
                <td key={c.title} className="py-1 text-right tabular-nums">
                  {get(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-sm text-fg-muted">
        {current && sameSemester && (
          <p>
            Dữ liệu học kỳ {data.semester} đang mở sẽ bị thay thế
            {current.dirty && <strong className="font-semibold text-planned-fg">, kể cả các thay đổi chưa tải xuống</strong>}.
          </p>
        )}
        {current && !sameSemester && <p>Dữ liệu học kỳ {current.data.semester} đang mở vẫn được giữ trong bản nháp.</p>}
        {hasOtherDraft && <p>Bản nháp học kỳ {data.semester} có sẵn trong trình duyệt sẽ bị thay thế.</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="primary" onClick={() => onConfirm(data)} autoFocus>
          {current && sameSemester ? 'Thay thế' : 'Mở'}
        </Button>
      </div>
    </Dialog>
  )
}
