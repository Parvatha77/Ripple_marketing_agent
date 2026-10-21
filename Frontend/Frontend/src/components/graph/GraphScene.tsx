import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { Graph } from '@/types'
import { layoutGraph } from '@/lib/graphLayout'
import { buildGraphLabels, edgeArcHeight } from '@/lib/graphLabels'
import { GraphNode3D } from './GraphNode3D'
import { GraphEdge3D } from './GraphEdge3D'
import { LayerPlanes } from './LayerPlanes'
import { TimeAxis } from './TimeAxis'
import { GraphLabelsOverlay } from './GraphLabelsOverlay'
import { LAYER_HEX } from '@/components/common/layerColors'

const CAMERA_TARGET: [number, number, number] = [16, -1, -19]
const CAMERA_POSITION: [number, number, number] = [16, 17, 46]

export function GraphScene({
  graph,
  selectedId,
  onSelect,
  nodeMagnitudes,
}: {
  graph: Graph
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** node_id -> 0-1 magnitude, drives live sphere sizing */
  nodeMagnitudes?: Record<string, number>
}) {
  const layoutNodes = useMemo(() => layoutGraph(graph), [graph])
  const nodeById = useMemo(() => new Map(layoutNodes.map((n) => [n.node_id, n])), [layoutNodes])
  const labels = useMemo(
    () => buildGraphLabels(graph, layoutNodes, nodeById, selectedId, LAYER_HEX),
    [graph, layoutNodes, nodeById, selectedId],
  )

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#F7F8F7']} />
      <fog attach="fog" args={['#F7F8F7', 30, 90]} />
      <PerspectiveCamera makeDefault position={CAMERA_POSITION} fov={40} />
      <OrbitControls
        makeDefault
        target={CAMERA_TARGET}
        enableDamping
        dampingFactor={0.08}
        minDistance={15}
        maxDistance={120}
        maxPolarAngle={Math.PI * 0.49}
      />

      <ambientLight intensity={0.9} />
      <directionalLight position={[14, 20, 18]} intensity={0.7} />
      <directionalLight position={[-10, 8, -10]} intensity={0.3} />

      <LayerPlanes />
      <TimeAxis />

      {graph.edges.map((edge, i) => {
        const source = nodeById.get(edge.source)
        const target = nodeById.get(edge.target)
        if (!source || !target) return null
        const dimmed = selectedId != null && selectedId !== edge.source && selectedId !== edge.target
        return (
          <GraphEdge3D
            key={`${edge.source}-${edge.target}-${i}`}
            source={source}
            target={target}
            label={edge.label}
            dimmed={dimmed}
            arcHeight={edgeArcHeight(i)}
          />
        )
      })}

      {layoutNodes.map((node) => (
        <GraphNode3D
          key={node.node_id}
          node={node}
          selected={node.node_id === selectedId}
          magnitude={nodeMagnitudes?.[node.node_id]}
          onSelect={(id) => onSelect(id)}
        />
      ))}

      <GraphLabelsOverlay labels={labels} />
    </Canvas>
  )
}
