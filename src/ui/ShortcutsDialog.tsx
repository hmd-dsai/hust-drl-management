import { btn, Dialog } from './Dialog.tsx'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

export const SHORTCUTS: [string, string][] = [
  [`${mod} + Z`, 'Hoàn tác'],
  [isMac ? '⌘ + Shift + Z' : 'Ctrl + Y', 'Làm lại'],
  [`${mod} + S`, 'Tải xuống file JSON'],
  ['Alt + 1 / 2 / 3', 'Chuyển màn hình Trạng thái / Hoạt động / Gợi ý'],
  ['?', 'Mở bảng phím tắt này'],
  ['Esc', 'Đóng hộp thoại'],
  ['Enter', 'Lưu ô đang sửa trong danh sách hoạt động'],
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Phím tắt" onClose={onClose}>
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="py-1.5 pr-4 whitespace-nowrap">
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-800">
                  {keys}
                </kbd>
              </td>
              <td className="py-1.5">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Khi đang gõ trong ô nhập, {mod} + Z hoàn tác chữ vừa gõ thay vì hoàn tác dữ liệu.
      </p>
      <div className="mt-4 flex justify-end">
        <button type="button" className={btn.primary} onClick={onClose} autoFocus>
          Đóng
        </button>
      </div>
    </Dialog>
  )
}
