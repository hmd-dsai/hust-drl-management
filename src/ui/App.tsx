import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
import { ImportDialog, type ImportState } from './ImportDialog.tsx'
import { NewDataDialog } from './NewDataDialog.tsx'
import { TempActivities } from './TempActivities.tsx'
import { StatusScreen } from './StatusScreen.tsx'
import { TopBar, type Tab } from './TopBar.tsx'
import { Welcome } from './Welcome.tsx'

const store = createDraftStore(browserStorage())
const AUTOSAVE_MS = 500
const MAX_FILE_BYTES = 5_000_000

const TAB_HASH: Record<Tab, string> = { status: '#/', activities: '#/hoat-dong' }
const tabFromHash = (): Tab => (window.location.hash === TAB_HASH.activities ? 'activities' : 'status')

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
  const [saveFailed, setSaveFailed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>(tabFromHash)
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const dirty = useMemo(() => (doc ? isDirty(doc.data, doc.savedSnapshot) : false), [doc])

  // ---- Bản nháp tự động: debounce, và ghi ngay khi đóng tab hoặc trước khi mở dữ liệu khác ----
  const pending = useRef<Doc | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const d = pending.current
    if (!d) return
    pending.current = null
    if (!store.save({ ...d, updatedAt: new Date().toISOString() })) setSaveFailed(true)
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
    if (doc) dispatch({ type: 'saved', snapshot: downloadUserData(doc.data) })
  }, [doc])

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

  // ---- Phím tắt ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        download()
      } else if (!isEditable(e.target) && !document.querySelector('dialog[open]')) {
        if (key === 'z') {
          e.preventDefault()
          dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
        } else if (key === 'y') {
          e.preventDefault()
          dispatch({ type: 'redo' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [download])

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
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {doc && (
        <TopBar
          data={doc.data}
          rubricId={resolveRubric(doc.data).id}
          dirty={dirty}
          semesters={semesters}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          onSwitchSemester={openSemester}
          onUndo={() => dispatch({ type: 'undo' })}
          onRedo={() => dispatch({ type: 'redo' })}
          onDownload={download}
          onUpload={() => fileInput.current?.click()}
          onNew={() => setShowNew(true)}
          tab={tab}
          onTab={(t) => (window.location.hash = TAB_HASH[t])}
        />
      )}

      {storageWarning && (
        <div role="alert" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
          ⚠ Trình duyệt không cho lưu bản nháp. Dữ liệu sẽ mất khi đóng tab, nhớ tải xuống.
        </div>
      )}

      {!doc ? null : tab === 'status' ? (
        <StatusScreen
          data={doc.data}
          onToggleExcluded={(id) =>
            dispatch({
              type: 'edit',
              recipe: (d) => {
                const list = d.excludedCriteria ?? []
                return { ...d, excludedCriteria: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }
              },
            })
          }
        />
      ) : (
        <TempActivities data={doc.data} onEdit={(recipe) => dispatch({ type: 'edit', recipe })} />
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
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="rounded-xl border-2 border-dashed border-white px-8 py-6 text-lg font-medium text-white">
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
          }}
        />
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
          }}
        />
      )}
    </div>
  )
}
