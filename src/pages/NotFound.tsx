import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
      <div className="max-w-xl rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.36em] text-amber-300">Page not found</p>
        <h1 className="mt-4 text-4xl font-semibold">Lost in the atlas?</h1>
        <p className="mt-4 text-slate-400">The route you requested does not exist yet. Return to the game hub to continue exploring.</p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
