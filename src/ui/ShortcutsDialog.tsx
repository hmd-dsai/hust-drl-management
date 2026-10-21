import { Dialog } from './Dialog.tsx'
import { Button } from './kit/index.ts'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

export const SHORTCUTS: [string, string][] = [
  [`${mod} + Z`, 'Hoàn tác'],
  [isMac ? '⌘ + Shift + Z' : 'Ctrl + Y', 'Làm lại'],
  [`${mod} + S`, 'Tải xuống file JSON'],
  ['Alt + 1 / 2 / 3', 'Chuyển màn hình Trạng thái / Hoạt động / Gợi ý'],
  ['?', 'Mở bảng phím tắt này'],
  ['Esc', 'Đóng hộp thoại'],
  ['Enter', 'Lưu trong panel thêm / sửa hoạt động (khi đang ở ô nhập một dòng)'],
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Phím tắt" onClose={onClose}>
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys} className="border-b border-border last:border-0">
              <td className="py-1.5 pr-4 whitespace-nowrap">
                <kbd className="rounded-sm border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs">
                  {keys}
                </kbd>
              </td>
              <td className="py-1.5">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-fg-subtle">
        Khi đang gõ trong ô nhập, {mod} + Z hoàn tác chữ vừa gõ thay vì hoàn tác dữ liệu.
      </p>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={onClose} autoFocus>
          Đóng
        </Button>
      </div>
    </Dialog>
  )
}
