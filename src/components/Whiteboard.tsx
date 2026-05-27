import React, { useRef, useState, useEffect } from 'react'
import * as Y from 'yjs'
import {
  Paintbrush,
  Square,
  Minus,
  Circle,
  Eraser,
  Undo2,
  Trash2,
  Sparkles,
  MousePointer
} from 'lucide-react'

interface WhiteboardProps {
  yDoc: Y.Doc
  provider: any // WebsocketProvider
}

interface ShapeData {
  id: string
  type: 'pencil' | 'line' | 'rect' | 'circle'
  color: string
  width: number
  glow: boolean
  points?: number[]
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  yDoc,
  provider,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<'pencil' | 'line' | 'rect' | 'circle' | 'eraser'>('pencil')
  const [color, setColor] = useState('#a855f7') // Start with violet
  const [brushWidth, setBrushWidth] = useState(4)
  const [neonGlow, setNeonGlow] = useState(true)
  
  // Local drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [shapes, setShapes] = useState<ShapeData[]>([])
  
  // Ref to hold the shape currently being drawn to avoid React state lag
  const currentShapeIdRef = useRef<string | null>(null)
  const myShapeIdsRef = useRef<string[]>([])

  // Shared Yjs Array for shapes
  const yShapesArray = yDoc.getArray<Y.Map<any>>('whiteboard-shapes')

  // Sync Yjs array with local state
  useEffect(() => {
    const updateLocalShapes = () => {
      const newShapes: ShapeData[] = []
      yShapesArray.forEach((yShape) => {
        if (!yShape) return
        const shapeId = yShape.get('id')
        const type = yShape.get('type')
        const color = yShape.get('color')
        const width = yShape.get('width')
        const glow = yShape.get('glow')

        if (type === 'pencil') {
          const yPoints = yShape.get('points') as Y.Array<number>
          const points = yPoints ? yPoints.toArray() : []
          newShapes.push({ id: shapeId, type, color, width, glow, points })
        } else {
          newShapes.push({
            id: shapeId,
            type,
            color,
            width,
            glow,
            x1: yShape.get('x1'),
            y1: yShape.get('y1'),
            x2: yShape.get('x2'),
            y2: yShape.get('y2'),
          })
        }
      })
      setShapes(newShapes)
    }

    // Run initially
    updateLocalShapes()

    // Observe changes
    yShapesArray.observeDeep(updateLocalShapes)

    return () => {
      yShapesArray.unobserveDeep(updateLocalShapes)
    }
  }, [yDoc])

  // Track pointer movements for remote user indicators
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({})

  useEffect(() => {
    const handleAwarenessUpdate = () => {
      const states = provider.awareness.getStates()
      const cursors: Record<string, { x: number; y: number; name: string; color: string }> = {}

      states.forEach((state: any, clientId: number) => {
        if (clientId === yDoc.clientID) return
        if (state.canvasCursor) {
          cursors[clientId.toString()] = {
            x: state.canvasCursor.x,
            y: state.canvasCursor.y,
            name: state.user?.name || 'Anonymous',
            color: state.user?.color || '#cbd5e1',
          }
        }
      })
      setRemoteCursors(cursors)
    }

    provider.awareness.on('change', handleAwarenessUpdate)
    return () => {
      provider.awareness.off('change', handleAwarenessUpdate)
    }
  }, [provider, yDoc])

  // Convert client coordinates to SVG local space
  const getCoordinates = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    
    let clientX = 0
    let clientY = 0
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    // Scale according to viewBox dimensions
    const viewBox = svgRef.current.viewBox.baseVal
    const x = ((clientX - rect.left) / rect.width) * viewBox.width
    const y = ((clientY - rect.top) / rect.height) * viewBox.height
    
    return { x: Math.round(x), y: Math.round(y) }
  }

  // Handle drawing start
  const handleStart = (coords: { x: number; y: number }) => {
    if (tool === 'eraser') return

    setIsDrawing(true)
    const newShapeId = `shape-${yDoc.clientID}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    currentShapeIdRef.current = newShapeId
    myShapeIdsRef.current.push(newShapeId)

    const yShape = new Y.Map()
    yDoc.transact(() => {
      yShape.set('id', newShapeId)
      yShape.set('type', tool)
      yShape.set('color', color)
      yShape.set('width', brushWidth)
      yShape.set('glow', neonGlow)

      if (tool === 'pencil') {
        const yPoints = new Y.Array<number>()
        yPoints.push([coords.x, coords.y])
        yShape.set('points', yPoints)
      } else {
        yShape.set('x1', coords.x)
        yShape.set('y1', coords.y)
        yShape.set('x2', coords.x)
        yShape.set('y2', coords.y)
      }
      yShapesArray.push([yShape])
    })
  }

  // Handle drawing move
  const handleMove = (coords: { x: number; y: number }) => {
    // Broadcast my canvas cursor to other users
    provider.awareness.setLocalStateField('canvasCursor', {
      x: coords.x,
      y: coords.y,
    })

    if (!isDrawing || !currentShapeIdRef.current) return

    // Find the current shape map in Yjs shapes array
    let yShape: Y.Map<any> | null = null
    for (let i = 0; i < yShapesArray.length; i++) {
      const shape = yShapesArray.get(i)
      if (shape && shape.get('id') === currentShapeIdRef.current) {
        yShape = shape
        break
      }
    }

    if (!yShape) return

    yDoc.transact(() => {
      if (tool === 'pencil') {
        const yPoints = yShape.get('points') as Y.Array<number>
        if (yPoints) {
          // Only append if it's different from the last point to optimize network packets
          const lastIdx = yPoints.length
          if (lastIdx >= 2) {
            const lastY = yPoints.get(lastIdx - 1)
            const lastX = yPoints.get(lastIdx - 2)
            if (lastX === coords.x && lastY === coords.y) return
          }
          yPoints.push([coords.x, coords.y])
        }
      } else {
        yShape.set('x2', coords.x)
        yShape.set('y2', coords.y)
      }
    })
  }

  const handleEnd = () => {
    setIsDrawing(false)
    currentShapeIdRef.current = null
  }

  // Mouse Handlers
  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e)
    if (!coords) return
    handleStart(coords)
  }

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e)
    if (!coords) return
    handleMove(coords)
  }

  const onMouseUp = () => {
    handleEnd()
  }

  // Touch Handlers for Mobile Support
  const onTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e)
    if (!coords) return
    handleStart(coords)
  }

  const onTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e)
    if (!coords) return
    handleMove(coords)
  }

  const onTouchEnd = () => {
    handleEnd()
  }

  // Clear cursor when mouse leaves canvas
  const onMouseLeave = () => {
    provider.awareness.setLocalStateField('canvasCursor', null)
    handleEnd()
  }

  // Click shape to delete when using Eraser
  const handleShapeClick = (shapeId: string, e: React.MouseEvent) => {
    if (tool !== 'eraser') return
    e.stopPropagation()

    // Find the index in Yjs array and delete
    for (let i = 0; i < yShapesArray.length; i++) {
      const shape = yShapesArray.get(i)
      if (shape && shape.get('id') === shapeId) {
        yShapesArray.delete(i, 1)
        break
      }
    }
  }

  // Undo last action (removes last drawn shape by this client)
  const handleUndo = () => {
    if (myShapeIdsRef.current.length === 0) return
    const shapeIdToUndo = myShapeIdsRef.current.pop()
    
    for (let i = yShapesArray.length - 1; i >= 0; i--) {
      const shape = yShapesArray.get(i)
      if (shape && shape.get('id') === shapeIdToUndo) {
        yShapesArray.delete(i, 1)
        break
      }
    }
  }

  // Clear Canvas entirely
  const handleClear = () => {
    if (confirm('Clear the entire whiteboard? This will erase drawings for everyone.')) {
      yShapesArray.delete(0, yShapesArray.length)
      myShapeIdsRef.current = []
    }
  }

  // Generate SVG path string from points array
  const getPencilPath = (points: number[]) => {
    if (points.length < 2) return ''
    let d = `M ${points[0]} ${points[1]}`
    for (let i = 2; i < points.length; i += 2) {
      d += ` L ${points[i]} ${points[i+1]}`
    }
    return d
  }

  const colors = [
    { value: '#ffffff', label: 'White' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#f43f5e', label: 'Rose' },
  ]

  const brushSizes = [2, 4, 8, 12]

  return (
    <div className="flex flex-col h-full w-full rounded-2xl glass-panel border border-white/8 overflow-hidden bg-slate-950/20 shadow-2xl relative">
      {/* Glow effect at top border */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      {/* Toolbar */}
      <div className="glass-panel-light flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-white/5 backdrop-blur-xl z-20">
        {/* Tools Select */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTool('pencil')}
            className={`glass-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 ${
              tool === 'pencil' ? 'glass-button-active text-violet-400 border border-violet-500/30' : ''
            }`}
            title="Pencil Tool"
          >
            <Paintbrush className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`glass-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 ${
              tool === 'line' ? 'glass-button-active text-violet-400 border border-violet-500/30' : ''
            }`}
            title="Line Tool"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`glass-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 ${
              tool === 'rect' ? 'glass-button-active text-violet-400 border border-violet-500/30' : ''
            }`}
            title="Rectangle Tool"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`glass-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 ${
              tool === 'circle' ? 'glass-button-active text-violet-400 border border-violet-500/30' : ''
            }`}
            title="Ellipse Tool"
          >
            <Circle className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`glass-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 ${
              tool === 'eraser' ? 'glass-button-active text-rose-400 border border-rose-500/30' : ''
            }`}
            title="Click Shape to Erase"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Colors selector */}
        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setColor(c.value)
                if (tool === 'eraser') setTool('pencil')
              }}
              className={`h-6 w-6 rounded-full border transition-all duration-200 hover:scale-110 ${
                color === c.value && tool !== 'eraser' ? 'ring-2 ring-offset-2 ring-violet-500 scale-105 border-white' : 'border-white/20'
              }`}
              style={{
                backgroundColor: c.value,
                boxShadow: color === c.value && tool !== 'eraser' ? `0 0 10px ${c.value}` : 'none',
              }}
              title={c.label}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Size & Glow Options */}
        <div className="flex items-center gap-3">
          {/* Size Select */}
          <div className="flex items-center gap-1">
            {brushSizes.map((size) => (
              <button
                key={size}
                onClick={() => setBrushWidth(size)}
                className={`glass-button flex h-7 px-2 items-center justify-center rounded text-xs text-slate-300 ${
                  brushWidth === size ? 'glass-button-active text-violet-400' : ''
                }`}
              >
                {size}px
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Toggle Glow */}
          <button
            onClick={() => setNeonGlow(!neonGlow)}
            className={`glass-button flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs ${
              neonGlow ? 'glass-button-active text-cyan-400 border border-cyan-500/30' : 'text-slate-400'
            }`}
            title="Toggle Neon Glow"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Neon</span>
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Actions (Undo/Clear) */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={myShapeIdsRef.current.length === 0}
            className="glass-button flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            title="Undo Last Stroke"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleClear}
            className="glass-button flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Clear Board"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 bg-slate-950/80 relative cursor-crosshair overflow-hidden min-h-[900px]">
        {/* Neon grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <svg
          ref={svgRef}
          viewBox="0 0 2400 1600"
          className="w-full h-full absolute inset-0 select-none touch-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* SVG Glow Filter Defs */}
          <defs>
            <filter id="glow-neon" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Render All shapes */}
          {shapes.map((shape) => {
            const isErasable = tool === 'eraser'
            const strokeColor = shape.color
            
            // Hover properties for eraser
            const interactiveProps = {
              onClick: (e: React.MouseEvent) => handleShapeClick(shape.id, e),
              className: isErasable ? 'hover:stroke-rose-500 hover:stroke-[8px] hover:opacity-80 transition-all cursor-pointer' : '',
            }

            const filterProp = shape.glow ? 'url(#glow-neon)' : undefined

            if (shape.type === 'pencil' && shape.points) {
              return (
                <path
                  key={shape.id}
                  d={getPencilPath(shape.points)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={shape.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={filterProp}
                  style={{ pointerEvents: isErasable ? 'stroke' : 'none' }}
                  {...interactiveProps}
                />
              )
            }

            if (shape.type === 'line' && shape.x1 !== undefined) {
              return (
                <line
                  key={shape.id}
                  x1={shape.x1}
                  y1={shape.y1}
                  x2={shape.x2}
                  y2={shape.y2}
                  stroke={strokeColor}
                  strokeWidth={shape.width}
                  strokeLinecap="round"
                  filter={filterProp}
                  style={{ pointerEvents: isErasable ? 'stroke' : 'none' }}
                  {...interactiveProps}
                />
              )
            }

            if (shape.type === 'rect' && shape.x1 !== undefined && shape.x2 !== undefined && shape.y1 !== undefined && shape.y2 !== undefined) {
              const x = Math.min(shape.x1, shape.x2)
              const y = Math.min(shape.y1, shape.y2)
              const width = Math.abs(shape.x2 - shape.x1)
              const height = Math.abs(shape.y2 - shape.y1)
              return (
                <rect
                  key={shape.id}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={shape.width}
                  strokeLinejoin="round"
                  filter={filterProp}
                  style={{ pointerEvents: isErasable ? 'all' : 'none' }}
                  {...interactiveProps}
                />
              )
            }

            if (shape.type === 'circle' && shape.x1 !== undefined && shape.x2 !== undefined && shape.y1 !== undefined && shape.y2 !== undefined) {
              const cx = (shape.x1 + shape.x2) / 2
              const cy = (shape.y1 + shape.y2) / 2
              const rx = Math.abs(shape.x2 - shape.x1) / 2
              const ry = Math.abs(shape.y2 - shape.y1) / 2
              return (
                <ellipse
                  key={shape.id}
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={shape.width}
                  filter={filterProp}
                  style={{ pointerEvents: isErasable ? 'all' : 'none' }}
                  {...interactiveProps}
                />
              )
            }

            return null
          })}

          {/* Render Remote user canvas cursors */}
          {Object.entries(remoteCursors).map(([clientId, data]) => {
            if (data.x === undefined || data.y === undefined) return null
            return (
              <g key={clientId} style={{ pointerEvents: 'none' }}>
                {/* Neon tracer dot */}
                <circle
                  cx={data.x}
                  cy={data.y}
                  r="6"
                  fill={data.color}
                  className="animate-ping opacity-60"
                />
                <circle
                  cx={data.x}
                  cy={data.y}
                  r="4"
                  fill={data.color}
                  stroke="white"
                  strokeWidth="1"
                />
                
                {/* Pointer icon */}
                <path
                  d={`M ${data.x} ${data.y} L ${data.x + 10} ${data.y + 15} L ${data.x + 4} ${data.y + 15} Z`}
                  fill={data.color}
                  stroke="white"
                  strokeWidth="0.5"
                  transform={`translate(-1, -1)`}
                />

                {/* Name Label */}
                <g transform={`translate(${data.x + 12}, ${data.y + 8})`}>
                  <rect
                    x="0"
                    y="0"
                    width={data.name.length * 6 + 12}
                    height="16"
                    rx="3"
                    fill="#0f172a"
                    stroke={data.color}
                    strokeWidth="0.5"
                    opacity="0.9"
                  />
                  <text
                    x="6"
                    y="11"
                    fill="white"
                    fontSize="8.5"
                    fontFamily="Inter, sans-serif"
                    fontWeight="bold"
                  >
                    {data.name}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-white/5 text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/40 backdrop-blur-xl">
        <span className="flex items-center gap-1.5">
          <MousePointer className="h-3 w-3" />
          <span>Active tool: <strong className="capitalize text-slate-200">{tool}</strong></span>
        </span>
        <span>{shapes.length} elements synced</span>
      </div>
    </div>
  )
}
