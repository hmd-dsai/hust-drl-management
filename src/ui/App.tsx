import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { resolveRubric } from '../domain/rubric.ts'
import type { UserData } from '../domain/types.ts'
import { initialState, reducer, type Doc } from '../state.ts'
import {
  browserStorage,
  createDraftStore,
  createEmptyUserData,
  downloadUserData,
  isDirty,
  parseUserDataFile,
  serializeUserData,
} from '../storage.ts'
import { ActivitiesScreen } from './ActivitiesScreen.tsx'
import { ImportDialog, type ImportState } from './ImportDialog.tsx'
import { Toast } from './kit/index.ts'
import { NewDataDialog } from './NewDataDialog.tsx'
import { StatusScreen } from './StatusScreen.tsx'
import { SuggestScreen } from './SuggestScreen.tsx'
import { ShortcutsDialog } from './ShortcutsDialog.tsx'
import { TABS, TopBar, type Tab } from './TopBar.tsx'
import type { Notify } from './notify.ts'
import { Welcome } from './Welcome.tsx'

const store = createDraftStore(browserStorage())
const AUTOSAVE_MS = 500
/** "Đã lưu bản nháp" hiện bao lâu trên thanh trên cùng. */
const SAVED_HINT_MS = 1500
const MAX_FILE_BYTES = 5_000_000

const TAB_HASH: Record<Tab, string> = { status: '#/', activities: '#/hoat-dong', suggest: '#/goi-y' }
const tabFromHash = (): Tab =>
  (Object.keys(TAB_HASH) as Tab[]).find((t) => TAB_HASH[t] === window.location.hash) ?? 'status'

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

export function App() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const draft = store.loadLatest()
    return initialState(draft && { data: draft.data, savedSnapshot: draft.savedSnapshot })
  })
  const { doc } = state
  const [importState, setImportState] = useState<ImportState | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // ---- Tab: mỗi màn hình giữ nguyên (không unmount) sau lần mở đầu, và nhớ vị trí cuộn riêng ----
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set([tabFromHash()]))
  const tabRef = useRef(tab)
  const scrollByTab = useRef<Partial<Record<Tab, number>>>({})
  useEffect(() => {
    const onHash = () => {
      const next = tabFromHash()
      if (next === tabRef.current) return
      scrollByTab.current[tabRef.current] = window.scrollY
      tabRef.current = next
      setTab(next)
      setVisited((v) => (v.has(next) ? v : new Set(v).add(next)))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useLayoutEffect(() => {
    window.scrollTo(0, scrollByTab.current[tab] ?? 0)
  }, [tab])

  // ---- Thông báo ngắn ----
  /** `after`: dữ liệu ngay sau thao tác có thể hoàn tác; dữ liệu đổi tiếp thì bỏ nút Hoàn tác (tránh hoàn tác nhầm). */
  const [notice, setNotice] = useState<{ key: number; message: string; undo: boolean; after: UserData | null } | null>(null)
  const notify = useCallback<Notify>((message, opts) => {
    setNotice({ key: Date.now(), message, undo: opts?.undo ?? false, after: null })
  }, [])
  const dismissNotice = useCallback(() => setNotice(null), [])
  useEffect(() => {
    if (!notice?.undo) return
    if (notice.after === null) setNotice({ ...notice, after: doc?.data ?? null })
    else if (notice.after !== doc?.data) setNotice(null)
  }, [doc?.data]) // chỉ phản ứng khi dữ liệu đổi

  const dirty = useMemo(() => (doc ? isDirty(doc.data, doc.savedSnapshot) : false), [doc])

  // ---- Bản nháp tự động: debounce, và ghi ngay khi đóng tab hoặc trước khi mở dữ liệu khác ----
  const pending = useRef<Doc | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [justSaved, setJustSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const d = pending.current
    if (!d) return
    pending.current = null
    if (!store.save({ ...d, updatedAt: new Date().toISOString() })) return setSaveFailed(true)
    setJustSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setJustSaved(false), SAVED_HINT_MS)
  }, [])
  useEffect(() => {
    if (!doc) return
    pending.current = doc
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, AUTOSAVE_MS)
  }, [doc, flush])
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [flush])

  const open = useCallback(
    (next: Doc) => {
      flush()
      dispatch({ type: 'load', doc: next })
    },
    [flush],
  )

  // ---- Nhắc sao lưu ----
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const download = useCallback(() => {
    if (!doc) return
    dispatch({ type: 'saved', snapshot: downloadUserData(doc.data) })
    notify(`Đã tải xuống file JSON học kỳ ${doc.data.semester}`)
  }, [doc, notify])

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0
  const undo = useCallback(() => {
    if (!canUndo) return
    dispatch({ type: 'undo' })
    notify('Đã hoàn tác')
  }, [canUndo, notify])
  const redo = useCallback(() => {
    if (!canRedo) return
    dispatch({ type: 'redo' })
    notify('Đã làm lại')
  }, [canRedo, notify])

  // ---- Tải lên: chọn file hoặc kéo thả ----
  const readFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setImportState({ kind: 'error', fileName: file.name, errors: ['File quá lớn (giới hạn 5 MB).'] })
      return
    }
    const res = parseUserDataFile(await file.text())
    setImportState(
      res.ok
        ? { kind: 'preview', fileName: file.name, data: res.value }
        : { kind: 'error', fileName: file.name, errors: res.errors },
    )
  }, [])

  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth += 1
      setDragging(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) void readFile(file)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [readFile])

  // ---- Phím tắt (xem ShortcutsDialog) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isEditable(e.target)
      const dialogOpen = document.querySelector('dialog[open]') !== null
      if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-3]$/.test(e.code)) {
        if (typing || dialogOpen || !doc) return
        e.preventDefault()
        window.location.hash = TAB_HASH[TABS[Number(e.code.slice(-1)) - 1]!.id]
        return
      }
      if (e.key === '?' && !typing && !dialogOpen) {
        e.preventDefault()
        setShowKeys(true)
        return
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        download()
      } else if (!typing && !dialogOpen) {
        if (key === 'z') {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
        } else if (key === 'y') {
          e.preventDefault()
          redo()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [download, undo, redo, doc])

  // ---- Dữ liệu theo học kỳ ----
  const dataFor = (semester: string): UserData | null =>
    doc?.data.semester === semester ? doc.data : (store.load(semester)?.data ?? null)
  const semesters = useMemo(
    () => [...new Set([...store.semesters(), ...(doc ? [doc.data.semester] : [])])].sort(),
    // danh sách chỉ đổi khi mở học kỳ khác
    [doc?.data.semester],
  )
  const openSemester = (semester: string) => {
    if (semester === doc?.data.semester) return
    flush()
    const draft = store.load(semester)
    if (draft) open({ data: draft.data, savedSnapshot: draft.savedSnapshot })
  }

  const storageWarning = !store.available || saveFailed

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {doc && (
        <TopBar
          data={doc.data}
          rubricId={resolveRubric(doc.data).id}
          dirty={dirty}
          semesters={semesters}
          justSaved={justSaved}
          canUndo={canUndo}
          canRedo={canRedo}
          onSwitchSemester={openSemester}
          onUndo={undo}
          onRedo={redo}
          onDownload={download}
          onUpload={() => fileInput.current?.click()}
          onNew={() => setShowNew(true)}
          tab={tab}
          onTab={(t) => (window.location.hash = TAB_HASH[t])}
          onShortcuts={() => setShowKeys(true)}
        />
      )}

      {storageWarning && (
        <div role="alert" className="bg-planned-soft px-4 py-2 text-center text-sm text-planned-fg">
          ⚠ Trình duyệt không cho lưu bản nháp. Dữ liệu sẽ mất khi đóng tab, nhớ tải xuống.
        </div>
      )}

      {doc && (
        <>
          {visited.has('status') && (
            <div hidden={tab !== 'status'}>
              <StatusScreen
                data={doc.data}
                onAddActivity={() => (window.location.hash = TAB_HASH.activities)}
                onToggleExcluded={(id) => {
                  const marking = !(doc.data.excludedCriteria ?? []).includes(id)
                  dispatch({
                    type: 'edit',
                    recipe: (d) => {
                      const list = d.excludedCriteria ?? []
                      return { ...d, excludedCriteria: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }
                    },
                  })
                  notify(marking ? `Đã đánh dấu ${id} không đạt` : `Đã bỏ đánh dấu ${id}`, { undo: true })
                }}
              />
            </div>
          )}
          {visited.has('activities') && (
            <div hidden={tab !== 'activities'}>
              <ActivitiesScreen data={doc.data} onEdit={(recipe) => dispatch({ type: 'edit', recipe })} notify={notify} />
            </div>
          )}
          {visited.has('suggest') && (
            <div hidden={tab !== 'suggest'}>
              <SuggestScreen
                data={doc.data}
                active={tab === 'suggest'}
                onEdit={(recipe) => dispatch({ type: 'edit', recipe })}
                notify={notify}
              />
            </div>
          )}
        </>
      )}
      {!doc && (
        <Welcome onUpload={() => fileInput.current?.click()} onNew={() => setShowNew(true)} />
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void readFile(file)
        }}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-fg/50 p-4">
          <div className="rounded-lg border-2 border-dashed border-canvas px-8 py-6 text-title text-canvas">
            Thả file JSON vào đây để tải lên
          </div>
        </div>
      )}

      {importState && (
        <ImportDialog
          state={importState}
          current={doc && { data: doc.data, dirty }}
          hasOtherDraft={
            importState.kind === 'preview' &&
            importState.data.semester !== doc?.data.semester &&
            store.load(importState.data.semester) !== null
          }
          onClose={() => setImportState(null)}
          onConfirm={(data) => {
            setImportState(null)
            open({ data, savedSnapshot: serializeUserData(data) })
            notify(`Đã mở dữ liệu học kỳ ${data.semester}`)
          }}
        />
      )}

      {showKeys && <ShortcutsDialog onClose={() => setShowKeys(false)} />}

      {notice && (
        <Toast
          key={notice.key}
          onDismiss={dismissNotice}
          action={notice.undo ? { label: 'Hoàn tác', onClick: undo } : undefined}
          duration={notice.undo ? 6000 : 2500}
        >
          {notice.message}
        </Toast>
      )}

      {showNew && (
        <NewDataDialog
          existing={dataFor}
          onClose={() => setShowNew(false)}
          onOpenExisting={(semester) => {
            setShowNew(false)
            openSemester(semester)
          }}
          onCreate={(semester) => {
            setShowNew(false)
            open({ data: createEmptyUserData(semester), savedSnapshot: null })
            notify(`Đã tạo dữ liệu học kỳ ${semester}`)
          }}
        />
      )}
    </div>
  )
}
