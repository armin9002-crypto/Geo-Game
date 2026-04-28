import { lazy, type FC, type LazyExoticComponent } from 'react'

export interface GameEntry {
  slug: string
  name: string
  description: string
  icon: string
  component: LazyExoticComponent<FC>
  status: 'available' | 'coming-soon'
}

export const GAMES: GameEntry[] = [
  {
    slug: 'country-guesser',
    name: 'Country Guesser',
    description: 'Identify highlighted countries on a world map.',
    icon: '🗺️',
    component: lazy(() => import('./country-guesser')),
    status: 'available',
  },
]
