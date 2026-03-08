import { useEffect, useRef } from 'react'

// Recreates msurguy's triangles background (github.com/msurguy/triangles)
// Interactive: light follows mouse, space to drop/pick up, click to add lights
export default function TriangleBackground({ isLightMode }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let width, height
    let animId
    let lights = []
    let mouseX = 0, mouseY = 0
    let lightDropped = false

    // ── Grid settings ──────────────────────────────────────────────
    const COLS = 22
    const BASE_COLOR = isLightMode ? [240, 245, 250] : [21, 22, 24] // Light slate vs Dark grey

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    // ── Light source ───────────────────────────────────────────────
    class Light {
      constructor(x, y, color) {
        this.x = x
        this.y = y
        this.color = color || [
          180 + Math.random() * 75,
          100 + Math.random() * 80,
          60 + Math.random() * 60,
        ]
        // In light mode we want it to tint slightly darker towards colors
        this.intensity = isLightMode ? 0.6 + Math.random() * 0.3 : 0.4 + Math.random() * 0.2
        this.dropped = false
      }
    }

    // ── Triangle grid ──────────────────────────────────────────────
    const getTriangles = () => {
      const tris = []
      const cellW = width / COLS
      const rows = Math.ceil(height / (cellW * 0.866)) + 2
      const cellH = cellW * 0.866 // equilateral triangle height

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col <= COLS + 1; col++) {
          const x = col * cellW + (row % 2 === 0 ? 0 : cellW / 2)
          const y = row * cellH

          // Upward triangle
          tris.push([
            [x, y + cellH],
            [x + cellW, y + cellH],
            [x + cellW / 2, y],
          ])
          // Downward triangle
          tris.push([
            [x, y],
            [x + cellW, y],
            [x + cellW / 2, y + cellH],
          ])
        }
      }
      return tris
    }

    // ── Color computation ──────────────────────────────────────────
    const centroid = (tri) => [
      (tri[0][0] + tri[1][0] + tri[2][0]) / 3,
      (tri[0][1] + tri[1][1] + tri[2][1]) / 3,
    ]

    const computeColor = (cx, cy) => {
      let r = BASE_COLOR[0], g = BASE_COLOR[1], b = BASE_COLOR[2]

      for (const light of lights) {
        const dx = cx - light.x
        const dy = cy - light.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.min(width, height) * 0.45 // Reduced max radius to keep more dark area
        if (dist > maxDist) continue

        const falloff = Math.pow(1 - dist / maxDist, 2.5) * light.intensity // Steeper falloff for a softer glow
        r += light.color[0] * falloff
        g += light.color[1] * falloff
        b += light.color[2] * falloff
      }

      // Slight depth variation based on position
      const noise = (cx * 0.003 + cy * 0.002) % 1
      const depthMod = 0.92 + noise * 0.16

      if (isLightMode) {
        // In light mode, blend the pure hue of the lights over the bright slate background perfectly
        let intensity = Math.min(1, Math.max(r, g, b) / 180)
        let hueR = r, hueG = g, hueB = b
        if (intensity > 0.05) {
          let maxVal = Math.max(r, g, b)
          hueR = (r / maxVal) * 255
          hueG = (g / maxVal) * 255
          hueB = (b / maxVal) * 255
        }
        return `rgb(${BASE_COLOR[0] * (1 - intensity) + hueR * intensity * depthMod | 0},${BASE_COLOR[1] * (1 - intensity) + hueG * intensity * depthMod | 0},${BASE_COLOR[2] * (1 - intensity) + hueB * intensity * depthMod | 0})`
      } else {
        return `rgb(${Math.min(255, r * depthMod) | 0},${Math.min(255, g * depthMod) | 0},${Math.min(255, b * depthMod) | 0})`
      }
    }

    // ── Draw frame ─────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const tris = getTriangles()
      for (const tri of tris) {
        const [cx, cy] = centroid(tri)
        ctx.beginPath()
        ctx.moveTo(tri[0][0], tri[0][1])
        ctx.lineTo(tri[1][0], tri[1][1])
        ctx.lineTo(tri[2][0], tri[2][1])
        ctx.closePath()
        ctx.fillStyle = computeColor(cx, cy)
        ctx.fill()
        // Very subtle edge lines
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      animId = requestAnimationFrame(draw)
    }

    // ── Event handlers ─────────────────────────────────────────────
    const onMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
      // Move first non-dropped light
      const free = lights.find(l => !l.dropped)
      if (free) { free.x = mouseX; free.y = mouseY }
    }

    const onKeyDown = (e) => {
      // Ignore key events from inputs and textareas
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault()
        const free = lights.find(l => !l.dropped)
        if (free) {
          free.dropped = true
        } else {
          // Pick up last dropped (closest to mouse)
          lights.forEach(l => { if (l.dropped) l.dropped = false })
        }
      }
      if (e.code === 'Enter') {
        // Add a new light at mouse position
        if (lights.length < 6) {
          lights.push(new Light(mouseX, mouseY))
        }
      }
    }

    const onClick = (e) => {
      // Drop current light and create new free one
      lights.forEach(l => { if (!l.dropped) l.dropped = true })
      if (lights.length < 6) {
        lights.push(new Light(e.clientX, e.clientY))
      }
    }

    // ── Init ───────────────────────────────────────────────────────
    resize()
    lights.push(new Light(width * 0.4, height * 0.35, [180, 110, 60])) // Darker initial colors
    lights.push(new Light(width * 0.7, height * 0.6, [60, 100, 180]))

    draw()

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('click', onClick)
    }
  }, [isLightMode])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0, background: 'var(--bg-primary)' }}
    />
  )
}