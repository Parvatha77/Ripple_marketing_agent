import { TIME_OFFSETS } from '@/types'

const TIME_X: Record<string, number> = { day_0: 0, day_30: 13, day_90: 26 }

export function TimeAxis() {
  return (
    <group>
      {TIME_OFFSETS.map((step) => (
        <mesh key={step} position={[TIME_X[step], -9.6, 2]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial color="#1F2A44" />
        </mesh>
      ))}
    </group>
  )
}
