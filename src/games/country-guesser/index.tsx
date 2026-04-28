import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import WorldMap from './WorldMap'
import QuizPanel from './QuizPanel'
import { COUNTRIES, type Country } from './countryData'

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const result: T[] = []

  while (result.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(index, 1)[0])
  }

  return result
}

function createChoices(currentIndex: number, countries: Country[]): Country[] {
  const correct = countries[currentIndex]
  const pool = countries.filter((country, index) => index !== currentIndex)
  return shuffle([correct, ...pickRandom(pool, 3)])
}

export default function CountryGuesser() {
  const [shuffledCountries, setShuffledCountries] = useState<Country[]>(() => shuffle([...COUNTRIES]))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)

  const currentCountry = shuffledCountries[currentIndex]
  const total = shuffledCountries.length

  const choices = useMemo(
    () => (currentIndex < total ? createChoices(currentIndex, shuffledCountries) : []),
    [currentIndex, shuffledCountries, total],
  )

  const finished = currentIndex >= total
  const currentProgress = Math.min(currentIndex + 1, total)

  const handleSelect = (id: number) => {
    if (answered || finished) {
      return
    }

    setSelectedId(id)
    setAnswered(true)

    if (id === currentCountry.id) {
      setScore((current) => current + 1)
      setStreak((current) => current + 1)
      return
    }

    setStreak(0)
  }

  const handleNext = () => {
    if (!answered || finished) {
      return
    }

    setCurrentIndex((current) => current + 1)
    setSelectedId(null)
    setAnswered(false)
  }

  const handleRestart = () => {
    setShuffledCountries(shuffle([...COUNTRIES]))
    setCurrentIndex(0)
    setScore(0)
    setStreak(0)
    setSelectedId(null)
    setAnswered(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Country Guesser</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Identify countries from their shape and location.
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400 sm:text-base">
              Use real TopoJSON data from world-atlas. Every round highlights a country, and your task is to find the correct name from four options.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 text-sm text-slate-300 shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Score</span>
              <span className="font-semibold text-white">{score} / {answered ? currentProgress : currentIndex}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Streak</span>
              <span className="font-semibold text-white">{streak}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Progress</span>
              <span className="font-semibold text-white">{currentProgress} of {total}</span>
            </div>
          </div>
        </div>

        {finished ? (
          <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40">
            <p className="text-sm uppercase tracking-[0.32em] text-amber-300/80">All countries completed</p>
            <h2 className="mt-6 text-4xl font-semibold text-white">Final Score</h2>
            <p className="mt-4 text-slate-400">You answered {score} of {total} countries correctly.</p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Play again
              </button>
              <Link
                to="/"
                className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Back to hub
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1.6fr_0.9fr]">
            <div>
              <WorldMap highlightedId={currentCountry.id} />
            </div>
            <QuizPanel
              choices={choices}
              selectedId={selectedId}
              answered={answered}
              correctId={currentCountry.id}
              onSelect={handleSelect}
              onNext={handleNext}
              showNext={answered}
            />
          </div>
        )}
      </div>
    </div>
  )
}
