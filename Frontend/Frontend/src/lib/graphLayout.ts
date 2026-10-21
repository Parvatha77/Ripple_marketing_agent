import type { CausalLayer, Graph, GraphNode, TimeOffset } from '@/types'

export interface LayoutNode extends GraphNode {
  position: [number, number, number]
}

const LAYER_Z: Record<CausalLayer, number> = {
  decision: 0,
  behavioral: -8,
  financial: -16,
  competitive: -24,
  brand: -32,
  recommendation: -40,
}

const TIME_X: Record<TimeOffset, number> = {
  day_0: 0,
  day_30: 13,
  day_90: 26,
}

export const LAYER_PLANES: { layer: CausalLayer; z: number }[] = (
  Object.keys(LAYER_Z) as CausalLayer[]
).map((layer) => ({ layer, z: LAYER_Z[layer] }))

/** Rough centroid of the whole layout — used to frame the default camera. */
export const GRAPH_CENTER: [number, number, number] = [13, 0, -20]

export function layoutGraph(graph: Graph): LayoutNode[] {
  const groups = new Map<string, GraphNode[]>()
  for (const node of graph.nodes) {
    const key = `${node.layer}__${node.time_offset}`
    const list = groups.get(key) ?? []
    list.push(node)
    groups.set(key, list)
  }

  const result: LayoutNode[] = []
  for (const [, nodes] of groups) {
    const count = nodes.length
    nodes.forEach((node, i) => {
      const baseX = TIME_X[node.time_offset]
      const baseZ = LAYER_Z[node.layer]
      // recommendation is a single bookend node — pull it slightly forward of its plane and center it
      const isRecommendation = node.layer === 'recommendation'
      const spread = count > 1 ? (i - (count - 1) / 2) * 6.5 : 0
      const y = isRecommendation ? 0 : spread
      const jitterZ = count > 1 ? (i % 2 === 0 ? 0.8 : -0.8) : 0
      result.push({
        ...node,
        position: [baseX + (isRecommendation ? 5 : 0), y, baseZ + jitterZ],
      })
    })
  }
  return result
}
