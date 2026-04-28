import { Link } from 'react-router-dom'
import type { GameEntry } from '../games/registry'

interface GameCardProps {
  game: GameEntry
}

export default function GameCard({ game }: GameCardProps) {
  const isAvailable = game.status === 'available'

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 transition duration-300 ${
        isAvailable ? 'hover:-translate-y-1 hover:border-amber-400/30' : 'opacity-60'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/10 text-3xl text-amber-300">
          {game.icon}
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{game.name}</p>
          <p className="mt-1 text-sm text-slate-400">{game.description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-400">
        <span className="rounded-full border border-slate-800/80 bg-slate-950/70 px-3 py-2 uppercase tracking-[0.18em] text-slate-400">
          {game.status.replace('-', ' ')}
        </span>
        {isAvailable ? (
          <Link
            to={`/games/${game.slug}`}
            className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Play now
          </Link>
        ) : (
          <span className="rounded-full bg-slate-800/80 px-4 py-2 text-slate-500">Coming soon</span>
        )}
      </div>
    </div>
  )
}
