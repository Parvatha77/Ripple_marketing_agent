import * as THREE from 'three'
import type { Graph } from '@/types'
import type { LayoutNode, } from '@/lib/graphLayout'
import { LAYER_PLANES } from '@/lib/graphLayout'
import { LAYER_LABELS, TIME_LABELS, TIME_OFFSETS } from '@/types'

export type LabelVariant = 'node' | 'edge' | 'layer' | 'time'

export interface GraphLabel {
  id: string
  text: string
  position: [number, number, number]
  variant: LabelVariant
  color: string
  dimmed: boolean
  emphasized: boolean
}

const TIME_X: Record<string, number> = { day_0: 0, day_30: 13, day_90: 26 }

/** Deterministic per-edge arc height so criss-crossing edges (and their labels) stay separable. */
export function edgeArcHeight(index: number): number {
  return 0.4 + (index % 4) * 0.22
}

/** Mirrors the arc apex offset used by GraphEdge3D's QuadraticBezierLine so labels sit on the curve. */
export function edgeMidpoint(a: [number, number, number], b: [number, number, number], arcHeight: number): THREE.Vector3 {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const mid = start.clone().add(end).multiplyScalar(0.5)
  mid.y += arcHeight
  // quadratic bezier evaluated at t=0.5: 0.25*start + 0.5*mid + 0.25*end
  return start.clone().multiplyScalar(0.25).add(mid.clone().multiplyScalar(0.5)).add(end.clone().multiplyScalar(0.25))
}

export function buildGraphLabels(
  graph: Graph,
  layoutNodes: LayoutNode[],
  nodeById: Map<string, LayoutNode>,
  selectedId: string | null,
  layerHex: Record<string, string>,
): GraphLabel[] {
  const labels: GraphLabel[] = []

  for (const { layer, z } of LAYER_PLANES) {
    labels.push({
      id: `layer-${layer}`,
      text: LAYER_LABELS[layer],
      position: [-11, 8, z],
      variant: 'layer',
      color: layerHex[layer],
      dimmed: false,
      emphasized: false,
    })
  }

  for (const step of TIME_OFFSETS) {
    labels.push({
      id: `time-${step}`,
      text: TIME_LABELS[step],
      position: [TIME_X[step], -10.15, 2],
      variant: 'time',
      color: '#4A5058',
      dimmed: false,
      emphasized: false,
    })
  }

  for (const node of layoutNodes) {
    const radius = node.layer === 'decision' || node.layer === 'recommendation' ? 0.85 : 0.6
    const dimmed = selectedId != null && selectedId !== node.node_id
    // labels alternate above/below their sphere (following the node's own spread offset)
    // so adjacent nodes in the same layer/time group don't stack their text on top of each other
    const labelDir = node.position[1] < 0 ? 1 : -1
    labels.push({
      id: `node-${node.node_id}`,
      text: node.label,
      position: [node.position[0], node.position[1] + labelDir * (radius + 0.5), node.position[2]],
      variant: 'node',
      color: layerHex[node.layer],
      dimmed,
      emphasized: node.node_id === selectedId,
    })
  }

  graph.edges.forEach((edge, i) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target) return
    const dimmed = selectedId != null && selectedId !== edge.source && selectedId !== edge.target
    const mid = edgeMidpoint(source.position, target.position, edgeArcHeight(i))
    labels.push({
      id: `edge-${i}`,
      text: edge.label,
      position: [mid.x, mid.y, mid.z],
      variant: 'edge',
      color: layerHex[target.layer],
      dimmed,
      emphasized: false,
    })
  })

  return labels
}
