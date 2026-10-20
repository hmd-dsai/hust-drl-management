// TẠM THỜI cho giai đoạn 3: đủ để sửa vài hoạt động và thử tải xuống/tải lên/undo.
// Sẽ được thay bằng màn hình Trạng thái (GĐ4) và Hoạt động (GĐ5).

import { resolveRubric } from '../domain/rubric.ts'
import { computeScenarios, SCENARIO_KEYS, SCENARIOS } from '../domain/scoring.ts'
import { STATUSES, type Activity, type Status, type UserData } from '../domain/types.ts'
import { STATUS_META } from './status.ts'

interface Props {
  data: UserData
  onEdit: (recipe: (d: UserData) => UserData) => void
}

export function TempActivities({ data, onEdit }: Props) {
  const scores = computeScenarios(resolveRubric(data), data)
  const update = (id: string, patch: Partial<Activity>) =>
    onEdit((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SCENARIO_KEYS.map((k) => (
          <div key={k} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-sm text-slate-500 dark:text-slate-400">{SCENARIOS[k].label}</div>
            <div className="text-3xl font-semibold tabular-nums">{scores[k].capped}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 font-semibold">Hoạt động ({data.activities.length})</h2>
      <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
        {data.activities.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
            <input
              // key theo tên để undo/redo cập nhật lại ô nhập
              key={a.name}
              defaultValue={a.name}
              aria-label="Tên hoạt động"
              onBlur={(e) => {
                const name = e.target.value.trim()
                if (name && name !== a.name) update(a.id, { name })
                else e.target.value = a.name
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-300 focus:border-slate-400 dark:hover:border-slate-600"
            />
            <span className="font-mono text-xs text-slate-500">{a.chosen ?? '—'}</span>
            <select
              value={a.status}
              aria-label="Trạng thái"
              onChange={(e) => update(a.id, { status: e.target.value as Status })}
              className={`rounded px-1 py-0.5 text-sm ring-1 ${STATUS_META[a.status].badge}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].icon} {STATUS_META[s].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`Xoá ${a.name}`}
              className="px-1 text-slate-400 hover:text-red-600"
              onClick={() => onEdit((d) => ({ ...d, activities: d.activities.filter((x) => x.id !== a.id) }))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-500">Màn hình tạm, sẽ được thay ở giai đoạn 4–5.</p>
    </main>
  )
}
