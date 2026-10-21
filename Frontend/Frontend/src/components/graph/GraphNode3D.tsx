import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { LayoutNode } from '@/lib/graphLayout'
import { LAYER_HEX } from '@/components/common/layerColors'

export function GraphNode3D({
  node,
  selected,
  magnitude = 0.5,
  onSelect,
}: {
  node: LayoutNode
  selected: boolean
  /** 0-1 — how large the projected effect is; drives sphere size, animates smoothly as it changes */
  magnitude?: number
  onSelect: (id: string) => void
}) {
  const meshRef = useRef<Mesh>(null)
  const currentScale = useRef(1)
  const [hovered, setHovered] = useState(false)
  const color = LAYER_HEX[node.layer]
  const isDecisionOrRec = node.layer === 'decision' || node.layer === 'recommendation'
  const radius = isDecisionOrRec ? 0.85 : 0.6

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const pulse = selected ? Math.sin(state.clock.elapsedTime * 3) * 0.06 + 1 : 1
    const magnitudeScale = 0.65 + Math.max(0, Math.min(1, magnitude)) * 0.75
    const target = magnitudeScale * (hovered ? 1.12 : 1) * pulse
    currentScale.current += (target - currentScale.current) * Math.min(1, delta * 6)
    meshRef.current.scale.setScalar(currentScale.current)
  })

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(node.node_id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          metalness={0.08}
          emissive={color}
          emissiveIntensity={selected ? 0.5 : hovered ? 0.3 : 0.12}
        />
      </mesh>
      {selected && (
        <mesh>
          <sphereGeometry args={[radius * 1.35, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.14} />
        </mesh>
      )}
    </group>
  )
}
