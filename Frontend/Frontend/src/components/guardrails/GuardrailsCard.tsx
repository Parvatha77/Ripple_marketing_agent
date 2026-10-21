import { Link } from 'react-router-dom'
import type { GuardrailEvent, Persona } from '@/types'

/** Splits rationale text on persona segment names and renders each as a clickable chip
 * back to the timeline, so every cited number/segment traces to its evidence. */
function RationaleWithLinks({ text, personas }: { text: string; personas: Persona[] }) {
  const names = personas.map((p) => p.segment_name).sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const parts = text.split(pattern)

  return (
    <p className="text-sm text-ink-soft leading-relaxed">
      {parts.map((part, i) => {
        const persona = personas.find((p) => p.segment_name === part)
        if (persona) {
          return (
            <Link
              key={i}
              to="/timeline"
              className="inline-flex items-center rounded px-1 mx-0.5 bg-brand-tint text-brand text-[13px] font-medium hover:underline"
            >
              {part}
            </Link>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

export function GuardrailsCard({ event, personas }: { event: GuardrailEvent; personas: Persona[] }) {
  return (
    <div className="rounded-xl border border-decision/25 bg-paper-raised shadow-panel overflow-hidden">
      <div className="bg-decision px-6 py-3">
        <span className="text-[11px] uppercase tracking-widest text-paper/70 font-medium">
          Strategy Guardrails — Recommendation Memo
        </span>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold text-ink leading-snug">{event.recommendation}</h2>
        <div className="border-t border-hairline pt-4">
          <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-2">Rationale</p>
          <RationaleWithLinks text={event.rationale} personas={personas} />
        </div>
      </div>
    </div>
  )
}
