import { btn } from './Dialog.tsx'

/** Màn hình chào khi chưa có dữ liệu. */
export function Welcome({ onUpload, onNew }: { onUpload: () => void; onNew: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold">Quản lý điểm rèn luyện HUST</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Nhập các hoạt động, app tự tính điểm theo bộ tiêu chí và gợi ý cách gán tiêu chí để được điểm cao nhất.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className={btn.primary} onClick={onUpload}>
          Tải lên file JSON
        </button>
        <button type="button" className={btn.secondary} onClick={onNew}>
          Tạo dữ liệu mới cho học kỳ…
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Hoặc kéo thả file JSON vào cửa sổ này.</p>
    </main>
  )
}
