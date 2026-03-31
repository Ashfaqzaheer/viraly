'use client'

import { useRef, useCallback, ReactNode } from 'react'

interface GlassCard3DProps {
  children: ReactNode
  className?: string
  glareColor?: string
  tiltIntensity?: number
}

export default function GlassCard3D({ children, className = '', glareColor = 'rgba(255,255,255,0.06)', tiltIntensity = 8 }: GlassCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (0.5 - y) * tiltIntensity
    const rotateY = (x - 0.5) * tiltIntensity

    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`

    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${glareColor}, transparent 60%)`
      glareRef.current.style.opacity = '1'
    }
  }, [tiltIntensity, glareColor])

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
    if (glareRef.current) glareRef.current.style.opacity = '0'
  }, [])

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-[box-shadow] duration-500 ease-premium ${className}`}
      style={{ transformStyle: 'preserve-3d', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Glare overlay */}
      <div ref={glareRef} className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300" />
      {children}
    </div>
  )
}
