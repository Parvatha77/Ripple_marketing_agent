import { useMemo, useState } from 'react'
import type { Graph, GraphNode } from '@/types'
import { LAYER_LABELS, TIME_LABELS } from '@/types'
import { LAYER_HEX } from '@/components/common/layerColors'

type SortKey = 'label' | 'layer' | 'time_offset'

export function GraphListView({
  graph,
  onSelect,
}: {
  graph: Graph
  onSelect: (id: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('time_offset')

  const sortedNodes = useMemo(() => {
    return [...graph.nodes].sort((a, b) => a[sortKey].localeCompare(b[sortKey]))
  }, [graph.nodes, sortKey])

  const edgesFor = (node: GraphNode) =>
    graph.edges.filter((e) => e.source === node.node_id || e.target === node.node_id)

  const sortHeader = (key: SortKey, label: string) => (
    <button
      onClick={() => setSortKey(key)}
      className={`text-left text-[11px] uppercase tracking-widest ${
        sortKey === key ? 'text-ink font-semibold' : 'text-ink-faint'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="rounded-lg border border-hairline bg-paper-raised overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-paper-sunken">
            <tr>
              <th className="px-3 py-2">{sortHeader('label', 'Node')}</th>
              <th className="px-3 py-2">{sortHeader('layer', 'Layer')}</th>
              <th className="px-3 py-2">{sortHeader('time_offset', 'Time')}</th>
              <th className="px-3 py-2 text-left text-[11px] uppercase tracking-widest text-ink-faint">
                Causal links
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedNodes.map((node) => (
              <tr
                key={node.node_id}
                className="border-b border-hairline last:border-0 hover:bg-paper-sunken cursor-pointer"
                onClick={() => onSelect(node.node_id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === 'Enter' && onSelect(node.node_id)}
              >
                <td className="px-3 py-2.5 text-ink">{node.label}</td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: LAYER_HEX[node.layer] }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: LAYER_HEX[node.layer] }} />
                    {LAYER_LABELS[node.layer]}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-tabular text-ink-soft text-xs">{TIME_LABELS[node.time_offset]}</td>
                <td className="px-3 py-2.5 text-xs text-ink-faint">
                  {edgesFor(node)
                    .map((e) => `${e.label} ${e.source === node.node_id ? '→' : '←'} ${e.source === node.node_id ? e.target : e.source}`)
                    .join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
