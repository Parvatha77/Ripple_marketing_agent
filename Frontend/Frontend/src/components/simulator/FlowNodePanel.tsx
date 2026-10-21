import type { EventLog } from '@/types'
import type { FlowNode } from '@/lib/simulationEngine'
import { evidenceForFlowNode } from '@/lib/flowEvidence'
import { isCompetitorEvent, isPersonaEvent } from '@/lib/eventLog'
import { DeltaFigure } from '@/components/common/DeltaFigure'

const ORDER_COLOR: Record<number, string> = {
  0: '#1F2A44',
  1: '#0F7A6E',
  2: '#6A4C93',
  3: '#B4472C',
}

const NODE_REASONING: Record<string, string> = {
  discount: 'This is the discount percentage you are testing. It drives all downstream effects on customer behavior and financial outcomes.',
  conversion: 'Purchase conversion rate increases as discount deepens. Price-sensitive personas respond strongly to discounts, driving higher intent and transaction volume.',
  full_price_loss: 'Full-price purchase percentage declines as discount becomes available. Customers anchor to the lower price point, reducing willingness to pay full price.',
  revenue: 'Total revenue increases due to higher transaction volume offsetting margin erosion. The magnitude depends on price elasticity of demand across persona segments.',
  price_sensitivity: 'Customer price sensitivity increases post-discount. Once customers experience the lower price, they become more price-conscious for future purchases.',
  margin: 'Margin per transaction declines with discount depth, but volume growth and reduced acquisition costs partially offset the impact over the 90-day period.',
  competitor: 'Competitor response follows predictably: at low discounts (<15%) they hold steady; at moderate discounts (15-25%) they match selectively; at aggressive discounts (>25%) they escalate with deep counters.',
  clv_retention: 'Customer lifetime value shifts based on whether the discount converts new high-value segments or cannibalizes existing margin. Loyalty delta at Day 30 is the key indicator.',
  brand: 'Brand strength either strengthens (if discount attracts aspirational buyers who stay loyal) or weakens (if it attracts deal-seekers who churn post-promo).',
}

export function FlowNodePanel({
  node,
  eventLog,
  onClose,
}: {
  node: FlowNode | null
  eventLog: EventLog
  onClose: () => void
}) {
  if (!node) {
    return (
      <aside className="rounded-lg border border-hairline bg-paper-raised p-5">
        <p className="text-sm text-ink-faint">
          Select a node in the graph to see the evidence behind it — the quotes and deltas that produced it.
        </p>
      </aside>
    )
  }

  const evidence = evidenceForFlowNode(node.id, eventLog)
  const reasoning = NODE_REASONING[node.id] || 'This metric is influenced by upstream decisions and competitive dynamics.'

  return (
    <aside className="rounded-lg border border-hairline bg-paper-raised p-5 flex flex-col gap-4 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: ORDER_COLOR[node.order] }}>
            {node.order === 0 ? 'Decision' : `Order ${node.order}`}
          </span>
          <h3 className="font-display text-base text-ink mt-1 leading-snug">{node.label}</h3>
          <p className="font-tabular text-sm text-ink-soft mt-0.5">{node.value}</p>
          {node.description && <p className="text-xs text-ink-soft mt-2">{node.description}</p>}
          {node.confidence !== undefined && (
            <div className="mt-3 p-2 bg-paper-sunken rounded text-xs">
              <span className="text-ink-faint">Confidence: </span>
              <span className="font-medium text-ink">{(node.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-ink-faint hover:text-ink text-sm shrink-0" aria-label="Close panel">
          ✕
        </button>
      </div>

      <div className="border-t border-hairline pt-3">
        <p className="text-[10px] uppercase tracking-widest text-ink-faint font-semibold mb-2">Why this value?</p>
        <p className="text-xs text-ink-soft leading-relaxed">{reasoning}</p>
      </div>

      {evidence.length === 0 ? (
        <p className="text-xs text-ink-faint">
          {node.id === 'discount' ? 'This is the input you\'re controlling.' : 'No underlying events for this node.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-faint">Grounded in</p>
          {evidence.map((e) => {
            if (isPersonaEvent(e)) {
              return (
                <div key={e.event_id} className="flex flex-col gap-1.5 rounded-md bg-paper-sunken p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">{e.actor_id.replace('per_', '')}</span>
                    <div className="flex gap-2">
                      <DeltaFigure value={e.purchase_intent_delta} label="intent" />
                      <DeltaFigure value={e.loyalty_delta} label="loyalty" />
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft italic leading-snug">"{e.quote}"</p>
                </div>
              )
            }
            if (isCompetitorEvent(e)) {
              return (
                <div key={e.event_id} className="flex flex-col gap-1.5 rounded-md bg-paper-sunken p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">{e.actor_id.replace('cmp_', '')}</span>
                    <span className="text-[10px] uppercase tracking-wide text-competitive font-semibold">{e.action}</span>
                  </div>
                  <p className="text-xs text-ink-soft leading-snug">{e.rationale}</p>
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </aside>
  )
}
