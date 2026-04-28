import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-3 text-white transition hover:text-amber-300">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl">🗺️</span>
          <div>
            <p className="font-semibold tracking-tight">GeoPlay</p>
            <p className="text-xs text-slate-400">Country Guesser platform</p>
          </div>
        </Link>
        <p className="rounded-full border border-slate-800/80 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          Explore geography games
        </p>
      </div>
    </header>
  )
}
