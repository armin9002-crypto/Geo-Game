import type { Country } from './countryData'

interface QuizPanelProps {
  choices: Country[]
  selectedId: number | null
  answered: boolean
  correctId: number
  onSelect: (id: number) => void
  onNext: () => void
  showNext: boolean
}

export default function QuizPanel({
  choices,
  selectedId,
  answered,
  correctId,
  onSelect,
  onNext,
  showNext,
}: QuizPanelProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Choose the correct country</p>
        <p className="text-lg font-semibold text-white">Which country is highlighted on the map?</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => {
          const isCorrect = choice.id === correctId
          const isSelected = choice.id === selectedId
          const statusClass = answered
            ? isCorrect
              ? 'bg-emerald-500/15 ring-1 ring-emerald-400/50 text-emerald-200'
              : isSelected
              ? 'bg-red-500/15 ring-1 ring-red-400/50 text-red-200'
              : 'bg-slate-950/80 text-slate-200'
            : 'bg-slate-950/80 text-slate-200 hover:bg-slate-900/90'

          return (
            <button
              key={choice.id}
              type="button"
              disabled={answered}
              onClick={() => onSelect(choice.id)}
              className={`rounded-3xl border border-slate-800/70 p-4 text-left font-medium transition ${statusClass}`}
            >
              {choice.name}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Select an answer to continue.</p>
        <button
          type="button"
          onClick={onNext}
          disabled={!showNext}
          className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-300"
        >
          {showNext ? 'Next Country' : 'Awaiting answer'}
        </button>
      </div>
    </div>
  )
}
