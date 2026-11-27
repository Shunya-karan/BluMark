export function Loading() { return <div className="py-12 text-center text-sm text-slate-500">Loading live data…</div>; }
export function ErrorState({ message }) { return <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{message}</div>; }
