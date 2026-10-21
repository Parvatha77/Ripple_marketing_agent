import { useEffect, useMemo, useState } from 'react'
import type { FlowEdge, FlowNode, FlowOrder } from '@/lib/simulationEngine'

const ORDER_COLOR: Record<FlowOrder, string> = {
  0: '#1F2A44',
  1: '#0F7A6E',
  2: '#6A4C93',
  3: '#B4472C',
}

const ORDER_LABEL: Record<FlowOrder, string> = {
  0: 'Decision',
  1: '1st order — days, high confidence',
  2: '2nd order — weeks, moderate confidence',
  3: '3rd order — months, lower confidence',
}

const TONE_COLOR: Record<FlowNode['tone'], string> = {
  positive: '#0F7A6E',
  negative: '#B4472C',
  neutral: '#848D96',
}

// Fixed layout — a hand-placed DAG reads far more clearly than anything force-directed at this node count.
const POSITIONS: Record<string, { x: number; y: number }> = {
  discount: { x: 90, y: 230 },
  conversion: { x: 340, y: 120 },
  full_price_loss: { x: 340, y: 340 },
  revenue: { x: 590, y: 120 },
  price_sensitivity: { x: 590, y: 340 },
  margin: { x: 810, y: 185 },
  competitor: { x: 1000, y: 120 },
  clv_retention: { x: 810, y: 350 },
  brand: { x: 1000, y: 350 },
}

const BASE_RADIUS: Record<string, number> = {
  discount: 36,
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function edgePathD(source: { x: number; y: number }, target: { x: number; y: number }): string {
  const dx = target.x - source.x
  const dy = target.y - source.y
  // nearly-horizontal edges stay straight; edges that also move vertically get a gentle curve
  if (Math.abs(dy) < 4) return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
  const c1x = source.x + dx * 0.55
  const c1y = source.y
  const c2x = source.x + dx * 0.45
  const c2y = target.y
  return `M ${source.x} ${source.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${target.x} ${target.y}`
}

export function RippleFlowGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const reducedMotion = useReducedMotion()
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 1080 460" className="w-full h-auto" role="img" aria-label="Ripple-effect flow graph">
        <defs>
          {edges.map((edge, i) => (
            <path
              key={`def-${i}`}
              id={`flow-edge-${i}`}
              d={edgePathD(POSITIONS[edge.source], POSITIONS[edge.target])}
              fill="none"
            />
          ))}
        </defs>

        {edges.map((edge, i) => {
          const source = POSITIONS[edge.source]
          const target = POSITIONS[edge.target]
          const dimmed = selectedId != null && selectedId !== edge.source && selectedId !== edge.target
          const color = ORDER_COLOR[edge.order]
          return (
            <g key={i} opacity={dimmed ? 0.25 : 1}>
              <path d={edgePathD(source, target)} fill="none" stroke={color} strokeWidth={1.75} opacity={0.55} />
              {!reducedMotion && (
                <circle r={3.2} fill={color}>
                  <animateMotion dur={`${2.6 + (i % 4) * 0.5}s`} repeatCount="indefinite" begin={`${i * 0.25}s`}>
                    <mpath href={`#flow-edge-${i}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          )
        })}

        {nodes.map((node) => {
          const pos = POSITIONS[node.id]
          const radius = (BASE_RADIUS[node.id] ?? 30) * (0.75 + node.magnitude * 0.5)
          const selected = node.id === selectedId
          const dimmed = selectedId != null && !selected
          const color = ORDER_COLOR[node.order]
          return (
            <g
              key={node.id}
              opacity={dimmed ? 0.35 : 1}
              className="cursor-pointer"
              onClick={() => onSelect(selected ? null : node.id)}
              tabIndex={0}
              role="button"
              aria-label={`${node.label}, ${node.value}`}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(selected ? null : node.id)}
            >
              {selected && <circle cx={pos.x} cy={pos.y} r={radius + 8} fill={color} opacity={0.14} />}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill="#F7F8F7"
                stroke={color}
                strokeWidth={selected ? 3 : 2}
              />
              <text
                x={pos.x}
                y={pos.y - 4}
                textAnchor="middle"
                className="font-sans"
                style={{ fontSize: 14, fontWeight: 600, fill: '#15181C' }}
              >
                {node.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 13}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: 11, fill: TONE_COLOR[node.tone] }}
              >
                {node.value}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-hairline pt-3">
        {([0, 1, 2, 3] as FlowOrder[]).map((order) => (
          <span key={order} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ORDER_COLOR[order] }} />
            {ORDER_LABEL[order]}
          </span>
        ))}
      </div>

      {selectedId && nodeById.get(selectedId) && (
        <p className="text-xs text-ink-faint">
          Selected: <span className="text-ink font-medium">{nodeById.get(selectedId)!.label}</span> —{' '}
          {nodeById.get(selectedId)!.value}
        </p>
      )}
    </div>
  )
}
