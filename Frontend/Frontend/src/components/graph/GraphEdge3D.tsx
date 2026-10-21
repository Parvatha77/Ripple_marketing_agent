import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import type { LayoutNode } from '@/lib/graphLayout'
import { LAYER_HEX } from '@/components/common/layerColors'

export function GraphEdge3D({
  source,
  target,
  dimmed,
  arcHeight,
}: {
  source: LayoutNode
  target: LayoutNode
  label: string
  dimmed: boolean
  arcHeight: number
}) {
  const start = new THREE.Vector3(...source.position)
  const end = new THREE.Vector3(...target.position)
  const mid = start.clone().add(end).multiplyScalar(0.5)
  mid.y += arcHeight // slight arc, varied per edge, so overlapping edges stay legible

  return (
    <QuadraticBezierLine
      start={start}
      end={end}
      mid={mid}
      color={dimmed ? '#c3c8c5' : LAYER_HEX[target.layer]}
      lineWidth={dimmed ? 0.8 : 1.4}
      transparent
      opacity={dimmed ? 0.35 : 0.75}
    />
  )
}
