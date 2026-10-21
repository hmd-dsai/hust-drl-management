import { useState } from 'react'
import { isSemester, rubricForSemester } from '../domain/rubric.ts'
import type { UserData } from '../domain/types.ts'
import { guessSemester } from '../storage.ts'
import { Dialog } from './Dialog.tsx'
import { Button, fieldClass } from './kit/index.ts'

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
            className={`${fieldClass} mt-1 block w-32`}
          />
        </label>
        <p id="semester-help" className="mt-1 text-sm text-fg-muted">
          {valid ? (
            <>Dùng rubric {rubricForSemester(semester).id}.</>
          ) : (
            <span className="text-rejected-fg">Cần dạng năm.kỳ, ví dụ 2026.1 (kỳ 1–3).</span>
          )}
        </p>
        {found && (
          <p className="mt-3 rounded-md bg-planned-soft p-2 text-sm text-planned-fg">
            Học kỳ {semester} đã có dữ liệu ({found.activities.length} hoạt động). Tạo mới sẽ xoá dữ liệu đó, nên tải
            xuống trước nếu cần giữ lại.
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>Huỷ</Button>
          {found && <Button onClick={() => onOpenExisting(semester)}>Mở dữ liệu đã có</Button>}
          <Button type="submit" variant="primary" disabled={!valid}>
            {found ? 'Xoá và tạo mới' : 'Tạo'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
