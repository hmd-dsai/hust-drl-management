import { useId, useMemo, useState } from 'react'
import { foldVietnamese } from '../domain/activities.ts'
import { rubricIndex } from '../domain/rubric.ts'
import type { Rubric } from '../domain/types.ts'
import { Badge } from './kit/index.ts'

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
    <div className="rounded-md border border-border-strong bg-canvas">
      {selected.length > 0 && (
        <ul aria-label="Đã chọn" className="flex flex-wrap gap-1 border-b border-border p-2">
          {selected.map((id) => {
            const known = index.get(id)?.kind === 'criterion'
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  title={known ? `${index.get(id)!.node.name} — bấm để bỏ` : 'Không có trong rubric — bấm để bỏ'}
                  aria-label={`Bỏ ${id}`}
                  className="flex min-h-11 items-center sm:min-h-0"
                >
                  <Badge tone={known ? 'neutral' : 'rejected'} className="hover:opacity-80">
                    {id} ✕
                  </Badge>
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
        className="block w-full border-b border-border bg-transparent px-2.5 py-[11px] text-base placeholder:text-fg-subtle sm:py-1.5 sm:text-sm"
      />
      <div id={listId} className="max-h-64 overflow-auto">
        {sections.length === 0 && <p className="p-2 text-sm text-fg-subtle">Không tìm thấy tiêu chí nào.</p>}
        {sections.map(({ cat, criteria }) => (
          <fieldset key={cat.id}>
            <legend className="sticky top-0 w-full bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted">
              {cat.id}. {cat.name}
            </legend>
            {criteria.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-start gap-2 px-2.5 py-3 text-sm hover:bg-surface sm:py-1">
                <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} className="mt-1" />
                <span className="min-w-0 flex-1">
                  <span className="mr-1 text-xs text-fg-subtle">{c.id}</span> {c.name}
                  {excluded.has(c.id) && <span className="ml-1 text-xs text-rejected-fg">✕ đang loại trừ</span>}
                </span>
                <span className="shrink-0 tabular-nums text-fg-subtle">{c.points > 0 ? `+${c.points}` : c.points}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  )
}
