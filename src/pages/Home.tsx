import Header from '../components/Header'
import GameCard from '../components/GameCard'
import { GAMES } from '../games/registry'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-800/80 bg-slate-900/70 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.32em] text-amber-300/80">Geography games</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Learn the world one country at a time.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Explore the first game in a growing geography platform. The country guesser uses real TopoJSON data from world-atlas and every game route is generated from a shared registry.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {GAMES.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
