import { rubrics } from '../domain/rubric.ts'

export function App() {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold">HUST DRL Tracker</h1>
      <p className="mt-2 text-slate-600">
        Đang dựng khung. Rubric đã nạp: {rubrics.map((r) => r.id).join(', ')}.
      </p>
    </main>
  )
}
