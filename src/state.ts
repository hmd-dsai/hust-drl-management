// State của app: UserData đang mở + lịch sử undo/redo. Reducer thuần, dùng với useReducer.

import type { UserData } from './domain/types.ts'

export const HISTORY_LIMIT = 50

export interface Doc {
  data: UserData
  /** Xem `Draft.savedSnapshot` trong storage.ts. */
  savedSnapshot: string | null
}

export interface AppState {
  doc: Doc | null
  past: UserData[]
  future: UserData[]
}

export type Action =
  /** Mở dữ liệu mới (tải lên, tạo mới, đổi học kỳ): xoá lịch sử. */
  | { type: 'load'; doc: Doc }
  /** Sửa dữ liệu; `recipe` phải là hàm thuần và không sửa trực tiếp đối số. */
  | { type: 'edit'; recipe: (data: UserData) => UserData }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Vừa tải xuống: snapshot là nội dung file. */
  | { type: 'saved'; snapshot: string }

export function initialState(doc: Doc | null): AppState {
  return { doc, past: [], future: [] }
}

export function reducer(state: AppState, action: Action): AppState {
  const { doc } = state
  switch (action.type) {
    case 'load':
      return initialState(action.doc)
    case 'saved':
      return doc ? { ...state, doc: { ...doc, savedSnapshot: action.snapshot } } : state
    case 'edit': {
      if (!doc) return state
      const next = action.recipe(doc.data)
      if (next === doc.data) return state
      return {
        doc: { ...doc, data: next },
        past: [...state.past, doc.data].slice(-HISTORY_LIMIT),
        future: [],
      }
    }
    case 'undo': {
      const prev = state.past[state.past.length - 1]
      if (!doc || !prev) return state
      return { doc: { ...doc, data: prev }, past: state.past.slice(0, -1), future: [doc.data, ...state.future] }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!doc || !next) return state
      return { doc: { ...doc, data: next }, past: [...state.past, doc.data], future: rest }
    }
  }
}
