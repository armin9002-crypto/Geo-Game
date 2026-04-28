import { createBrowserRouter } from 'react-router-dom'
import { Suspense } from 'react'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import { GAMES } from './games/registry'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-xl rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
        <p className="text-lg font-semibold text-white">Loading game…</p>
        <p className="mt-2 text-sm text-slate-400">Preparing the map and quiz interface.</p>
      </div>
    </div>
  )
}

const routes = [
  {
    path: '/',
    element: <Home />,
  },
  ...GAMES.map((game) => ({
    path: `/games/${game.slug}`,
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <game.component />
      </Suspense>
    ),
  })),
  {
    path: '*',
    element: <NotFound />,
  },
]

const router = createBrowserRouter(routes)

export default router
