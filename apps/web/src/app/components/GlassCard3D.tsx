'use client'

import { ReactNode, useRef, useState } from 'react'

interface GlassCard3DProps {
  children: ReactNode
  className?: string
}

export default function GlassCard3D({ children, className = '' }: GlassCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (0.5 - y) * 8
    const rotateY = (x - 0.5) * 8
    setTransform(`perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
    setGlarePos({ x: x * 100, y: y * 100 })
  }

  function handleMouseLeave() {
    setTransform('')
    setIsHovered(false)
  }

  function handleMouseEnter() {
    setIsHovered(true)
  }

  return (
    <div
      ref={cardRef}
      className={`glass rounded-2xl relative overflow-hidden ${className}`}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: transform ? 'none' : 'transform 0.4s ease',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glare overlay */}
      {isHovered && (
        <div
          className="absolute inset-0 pointer-events-none z-10 rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.06) 0%, transparent 60%)`,
          }}
        />
      )}
      <div style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </div>
  )
}
