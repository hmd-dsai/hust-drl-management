import { useState } from 'react'
import { isSemester, rubricForSemester } from '../domain/rubric.ts'
import type { UserData } from '../domain/types.ts'
import { guessSemester } from '../storage.ts'
import { btn, Dialog } from './Dialog.tsx'

interface Props {
  initialSemester?: string
  /** Dữ liệu đã có của một học kỳ (đang mở hoặc bản nháp), để cảnh báo trước khi ghi đè. */
  existing: (semester: string) => UserData | null
  onCreate: (semester: string) => void
  onOpenExisting: (semester: string) => void
  onClose: () => void
}

/** "Tạo dữ liệu mới cho học kỳ…" (SPEC mục 8). */
export function NewDataDialog({ initialSemester, existing, onCreate, onOpenExisting, onClose }: Props) {
  const [semester, setSemester] = useState(initialSemester ?? guessSemester())
  const valid = isSemester(semester)
  const found = valid ? existing(semester) : null

  return (
    <Dialog title="Tạo dữ liệu mới" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onCreate(semester)
        }}
      >
        <label className="block text-sm">
          Học kỳ
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value.trim())}
            placeholder="2026.1"
            autoFocus
            aria-invalid={!valid}
            aria-describedby="semester-help"
            className="mt-1 block w-32 rounded border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-600"
          />
        </label>
        <p id="semester-help" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {valid ? (
            <>Dùng rubric {rubricForSemester(semester).id}.</>
          ) : (
            <span className="text-red-700 dark:text-red-300">Cần dạng năm.kỳ, ví dụ 2026.1 (kỳ 1–3).</span>
          )}
        </p>
        {found && (
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
            Học kỳ {semester} đã có dữ liệu ({found.activities.length} hoạt động). Tạo mới sẽ xoá dữ liệu đó, nên tải
            xuống trước nếu cần giữ lại.
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className={btn.secondary} onClick={onClose}>
            Huỷ
          </button>
          {found && (
            <button type="button" className={btn.secondary} onClick={() => onOpenExisting(semester)}>
              Mở dữ liệu đã có
            </button>
          )}
          <button type="submit" className={btn.primary} disabled={!valid}>
            {found ? 'Xoá và tạo mới' : 'Tạo'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
