import { useId, useMemo, useState } from 'react'
import { foldVietnamese } from '../domain/activities.ts'
import { rubricIndex } from '../domain/rubric.ts'
import type { Rubric } from '../domain/types.ts'

const CODE_RE = /^[a-z]+\.[0-9]*(\.[a-z]*)?$/

interface Props {
  rubric: Rubric
  selected: string[]
  onChange: (ids: string[]) => void
  /** Loại trừ hiệu lực, để đánh dấu trong danh sách. */
  excluded: ReadonlySet<string>
  autoFocus?: boolean
}

/** Ô chọn nhiều tiêu chí: tìm theo tên hoặc mã (không phân biệt dấu), nhóm theo mục lớn. */
export function CriterionPicker({ rubric, selected, onChange, excluded, autoFocus }: Props) {
  const [query, setQuery] = useState('')
  const listId = useId()
  const index = rubricIndex(rubric)
  const chosen = new Set(selected)
  const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id])

  const sections = useMemo(() => {
    const words = foldVietnamese(query).split(/\s+/).filter(Boolean)
    return rubric.categories
      .map((cat) => ({
        cat,
        criteria: cat.groups.flatMap((g) => g.criteria).filter((c) => {
          const id = c.id.toLowerCase()
          const hay = foldVietnamese(`${c.id} ${c.name}`)
          // Từ khoá dạng mã ("v.1", "iii.2.") khớp theo đầu mã, để "V.1" không ra cả "IV.1".
          return words.every((w) => (CODE_RE.test(w) ? id.startsWith(w) : hay.includes(w)))
        }),
      }))
      .filter((s) => s.criteria.length > 0)
  }, [rubric, query])

  return (
    <div className="rounded-md border border-slate-300 dark:border-slate-700">
      {selected.length > 0 && (
        <ul aria-label="Đã chọn" className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-slate-800">
          {selected.map((id) => {
            const known = index.get(id)?.kind === 'criterion'
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  title={known ? `${index.get(id)!.node.name} — bấm để bỏ` : 'Không có trong rubric — bấm để bỏ'}
                  className={`rounded px-1.5 py-0.5 font-mono text-xs ring-1 ${
                    known ? 'bg-slate-100 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600' : 'bg-red-100 text-red-900 ring-red-400 dark:bg-red-400/15 dark:text-red-200'
                  }`}
                >
                  {id} ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm theo tên hoặc mã, ví dụ: tình nguyện, III.2"
        aria-label="Tìm tiêu chí"
        aria-controls={listId}
        autoFocus={autoFocus}
        className="block w-full border-b border-slate-200 bg-transparent px-2 py-1.5 text-sm dark:border-slate-800"
      />
      <div id={listId} className="max-h-64 overflow-auto">
        {sections.length === 0 && <p className="p-2 text-sm text-slate-500">Không tìm thấy tiêu chí nào.</p>}
        {sections.map(({ cat, criteria }) => (
          <fieldset key={cat.id}>
            <legend className="sticky top-0 w-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {cat.id}. {cat.name}
            </legend>
            {criteria.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-start gap-2 px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} className="mt-1" />
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-slate-500 dark:text-slate-400">{c.id}</span> {c.name}
                  {excluded.has(c.id) && <span className="ml-1 text-xs text-red-700 dark:text-red-300">✕ đang loại trừ</span>}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">{c.points > 0 ? `+${c.points}` : c.points}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  )
}
