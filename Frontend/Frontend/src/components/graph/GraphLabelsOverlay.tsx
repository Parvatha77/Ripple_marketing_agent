import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GraphLabel } from '@/lib/graphLabels'

const v = new THREE.Vector3()

/**
 * Renders every node/edge/layer/time label for the ripple graph through a
 * single Html root, with per-frame screen-space projection done manually.
 * Mounting one <Html> per node/edge (30+ separate React roots) starves under
 * contention — this collapses all of it into one root updated imperatively.
 */
export function GraphLabelsOverlay({ labels }: { labels: GraphLabel[] }) {
  const { camera, size } = useThree()
  const elRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useFrame(() => {
    for (const label of labels) {
      const el = elRefs.current[label.id]
      if (!el) continue
      v.set(...label.position)
      v.project(camera)
      const behind = v.z > 1 || v.z < -1
      if (behind) {
        el.style.display = 'none'
        continue
      }
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      el.style.display = 'block'
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
    }
  })

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {labels.map((label) => (
          <div
            key={label.id}
            data-label-id={label.id}
            data-label-variant={label.variant}
            ref={(el) => {
              elRefs.current[label.id] = el
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              whiteSpace: label.variant === 'node' ? 'normal' : 'nowrap',
              textAlign: 'center',
              maxWidth: label.variant === 'node' ? '8.5rem' : undefined,
              padding: label.variant === 'layer' || label.variant === 'time' ? 0 : '1px 5px',
              borderRadius: 4,
              fontSize: label.variant === 'node' ? 10 : label.variant === 'edge' ? 8.5 : 11,
              fontStyle: label.variant === 'edge' ? 'italic' : 'normal',
              fontWeight: label.variant === 'layer' || label.variant === 'time' ? 600 : 500,
              textTransform: label.variant === 'layer' ? 'uppercase' : 'none',
              letterSpacing: label.variant === 'layer' ? '0.06em' : 'normal',
              lineHeight: 1.25,
              color: label.variant === 'layer' ? label.color : label.variant === 'edge' ? '#4A5058' : '#15181C',
              background:
                label.variant === 'layer' || label.variant === 'time' ? 'transparent' : 'rgba(247,248,247,0.88)',
              opacity: label.dimmed ? 0.35 : label.variant === 'layer' ? 0.65 : 1,
              border: label.emphasized ? `1px solid ${label.color}` : '1px solid transparent',
              fontFamily: label.variant === 'node' || label.variant === 'edge' ? 'Inter, sans-serif' : 'inherit',
            }}
          >
            {label.text}
          </div>
        ))}
      </div>
    </Html>
  )
}
