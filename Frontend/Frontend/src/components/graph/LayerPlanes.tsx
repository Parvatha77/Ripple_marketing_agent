import { LAYER_PLANES } from '@/lib/graphLayout'
import { LAYER_HEX } from '@/components/common/layerColors'

const PLANE_WIDTH = 40
const PLANE_HEIGHT = 20

export function LayerPlanes() {
  return (
    <group>
      {LAYER_PLANES.map(({ layer, z }) => (
        <mesh key={layer} position={[13, 0, z]}>
          <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
          <meshBasicMaterial color={LAYER_HEX[layer]} transparent opacity={0.035} side={2} />
        </mesh>
      ))}
    </group>
  )
}
