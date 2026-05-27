import { useState, useMemo, useEffect } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Header } from './components/Header'
import { TextEditor } from './components/TextEditor'
import { Whiteboard } from './components/Whiteboard'
import { getRandomUser } from './utils/randomUser'
import { Paintbrush, FileText, Info, Sparkles, LogIn, Maximize2, Minimize2 } from 'lucide-react'

function App() {
  // 1. Manage Room ID routing
  const getInitialRoomId = () => {
    const params = new URLSearchParams(window.location.search)
    let room = params.get('room')
    if (!room) {
      room = Math.random().toString(36).substring(2, 9)
      params.set('room', room)
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }
    return room
  }

  const [roomId, setRoomId] = useState(getInitialRoomId())
  const [roomInput, setRoomInput] = useState(roomId)

  // 2. Set up local presence details (username, color, join state)
  const suggestedUser = useMemo(() => getRandomUser(), [])
  const [isJoined, setIsJoined] = useState(false)
  const [username, setUsername] = useState('')
  const [usercolor, setUsercolor] = useState('')

  // Set default values from suggested user when mounting
  useEffect(() => {
    setUsername(suggestedUser.name)
    setUsercolor(suggestedUser.color)
  }, [suggestedUser])

  // 3. Initialize Yjs doc
  const yDoc = useMemo(() => new Y.Doc(), [])
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  // Track active users
  const [activeUsers, setActiveUsers] = useState<Array<{ id: string | number; name: string; color: string }>>([])

  // Whiteboard panel toggle state
  const [showWhiteboard, setShowWhiteboard] = useState(true)
  const [whiteboardFullscreen, setWhiteboardFullscreen] = useState(false)

  // Connection Lifecycle
  useEffect(() => {
    if (!isJoined) {
      setProvider(null)
      setActiveUsers([])
      return
    }

    // Connect to your custom Render backend for real-time collaboration
    // If your Render server is still down, you can temporarily use: 'wss://demos.yjs.dev/ws'
    const wsUrl = import.meta.env.PROD 
      ? 'wss://workspace-by-darkirat.onrender.com'
      : 'ws://localhost:1234'

    const wsProvider = new WebsocketProvider(wsUrl, roomId, yDoc)
    setProvider(wsProvider)

    // Handle connection status changes
    wsProvider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setConnectionStatus(event.status)
    })

    // Setup local user details in Yjs awareness
    const awareness = wsProvider.awareness
    awareness.setLocalState({
      user: { name: username, color: usercolor },
    })

    // Listen to changes in awareness to list other clients
    const handleAwarenessChange = () => {
      const states = awareness.getStates()
      const usersList: Array<{ id: string | number; name: string; color: string }> = []
      
      states.forEach((state: any, clientId: number) => {
        if (state.user) {
          usersList.push({
            id: clientId,
            name: state.user.name,
            color: state.user.color,
          })
        }
      })
      setActiveUsers(usersList)
    }

    awareness.on('change', handleAwarenessChange)

    return () => {
      wsProvider.destroy()
    }
  }, [roomId, yDoc, isJoined])

  // Dynamically update awareness when username or color changes
  useEffect(() => {
    if (provider) {
      provider.awareness.setLocalState({
        user: { name: username, color: usercolor },
      })
    }
  }, [provider, username, usercolor])

  // Share room link via clipboard
  const handleCopyLink = () => {
    if (window.location.protocol === 'file:') {
      // In the desktop app, copy the live URL so people can join from the browser
      navigator.clipboard.writeText(`https://workspace-by-darkirat.vercel.app/?room=${roomId}`)
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // Leave room logic
  const handleLeaveRoom = () => {
    if (confirm('Are you sure you want to leave the workspace?')) {
      setIsJoined(false)
      setProvider(null)
      setConnectionStatus('connecting')
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden pb-12 flex flex-col">
      {/* Dynamic Animated Glowing Orbs Background (Shown on both login/room views) */}
      <div className="absolute inset-0 -z-50 overflow-hidden pointer-events-none">
        {/* Orb 1: Violet */}
        <div className="absolute top-[10%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-600/15 blur-[120px] animate-float-slow" />
        {/* Orb 2: Cyan */}
        <div className="absolute bottom-[20%] right-[15%] h-[400px] w-[400px] rounded-full bg-cyan-600/10 blur-[130px] animate-float-medium" />
        {/* Orb 3: Fuchsia */}
        <div className="absolute top-[60%] left-[5%] h-[250px] w-[250px] rounded-full bg-fuchsia-600/10 blur-[100px] animate-float-slow" />
      </div>

      {!isJoined ? (
        /* 1. Gate Screen: Customize Name & Color */
        <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
          <div className="glass-panel max-w-md w-full p-8 rounded-2xl border border-white/8 shadow-2xl relative overflow-hidden bg-slate-950/45">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
            
            <div className="text-center mb-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 mb-3 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                <Sparkles className="h-5 w-5 text-violet-400 text-glow-indigo animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent m-0 leading-tight lowercase">
                workspace <span className="text-sm font-normal text-slate-400 normal-case">by darkirat</span>
              </h2>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Configure your workspace and details below
              </p>
            </div>

            <div className="space-y-6">
              {/* Display Name Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 px-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full px-4 py-3 rounded-xl text-center text-sm font-semibold tracking-wide text-white uppercase focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              {/* Room Code Input */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 px-1">
                  Workspace Room Code / ID
                </label>
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="glass-input w-full px-4 py-3 rounded-xl text-center text-sm font-semibold tracking-wider text-cyan-400 focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter or create room code"
                  maxLength={30}
                />
              </div>

              {/* Cursor/Stroke Color Picker */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3 px-1 text-center">
                  Select Cursor / Brush Color
                </label>
                <div className="flex items-center justify-center gap-3">
                  {[
                    '#a855f7', // Violet
                    '#ec4899', // Pink
                    '#3b82f6', // Blue
                    '#06b6d4', // Cyan
                    '#10b981', // Emerald
                    '#f59e0b', // Amber
                    '#f43f5e', // Rose
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setUsercolor(c)}
                      className={`h-7 w-7 rounded-full border transition-all duration-200 hover:scale-115 cursor-pointer ${
                        usercolor === c ? 'ring-2 ring-offset-2 ring-violet-500 scale-110 border-white' : 'border-white/10'
                      }`}
                      style={{
                        backgroundColor: c,
                        boxShadow: usercolor === c ? `0 0 10px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Enter Room Button */}
              <button
                onClick={() => {
                  if (!username.trim()) {
                    alert('Please enter a display name.')
                    return
                  }
                  
                  let finalRoom = roomInput.trim()
                  if (!finalRoom) {
                    finalRoom = Math.random().toString(36).substring(2, 9)
                  }
                  
                  // Update URL parameter
                  const params = new URLSearchParams(window.location.search)
                  params.set('room', finalRoom)
                  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                  
                  // Update active room ID states and join
                  setRoomId(finalRoom)
                  setRoomInput(finalRoom)
                  setIsJoined(true)
                }}
                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 font-bold text-sm tracking-wider uppercase text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Join Workspace</span>
              </button>
            </div>

            <div className="text-center mt-8 pt-4 border-t border-white/5 text-[9px] text-slate-500 tracking-wider">
              WORKSPACE BY DARKIRAT • CO-WRITING & COLLABORATIVE SKETCHING
            </div>
          </div>
        </div>
      ) : (
        /* 2. Workspace View */
        <>
          {/* Header component */}
          <Header
            roomId={roomId}
            connectionStatus={connectionStatus}
            users={activeUsers}
            currentUser={{ name: username, color: usercolor }}
            onCopyRoomLink={handleCopyLink}
            onLeave={handleLeaveRoom}
          />

          {/* Welcome Banner */}
          <div className="max-w-[1700px] w-full mx-auto px-6 mt-4 mb-4">
            <div className="glass-panel-light rounded-xl p-3 px-4 border border-white/5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-violet-400" />
                <span>
                  You are collaborating as <strong style={{ color: usercolor }}>{username}</strong>. Invite friends to code & sketch in real-time!
                </span>
              </div>
              <span className="hidden md:inline-block bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full font-semibold">
                yjs + web-sockets
              </span>
            </div>
          </div>

          {/* Main Workspace Layout */}
          <main className="max-w-[1700px] w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
            {/* Rich Text Editor */}
            {!whiteboardFullscreen && (
              <section className={`transition-all duration-500 ease-in-out ${
                showWhiteboard ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12 xl:col-span-12'
              }`}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <FileText className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300">Editor Panel</h2>
                </div>
                {provider && (
                  <TextEditor
                    yDoc={yDoc}
                    provider={provider}
                    currentUser={{ name: username, color: usercolor }}
                  />
                )}
              </section>
            )}

            {/* Whiteboard — normal sidebar or fullscreen overlay */}
            {showWhiteboard && (
              whiteboardFullscreen ? (
                /* Fullscreen Whiteboard Overlay */
                <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl justify-between">
                    <span className="flex items-center gap-2">
                      <Paintbrush className="h-4 w-4 text-cyan-400" />
                      <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300">Whiteboard Canvas</h2>
                      <span className="text-[10px] text-slate-500 font-medium ml-2">Fullscreen Mode</span>
                    </span>
                    <button
                      onClick={() => setWhiteboardFullscreen(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-button text-xs text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/40 transition-all"
                      title="Exit Fullscreen"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>Exit Fullscreen</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {provider && (
                      <Whiteboard
                        yDoc={yDoc}
                        provider={provider}
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Normal Sidebar Whiteboard */
                <section className="lg:col-span-5 xl:col-span-5 transition-all duration-500 ease-in-out flex flex-col">
                  <div className="flex items-center gap-2 mb-2 px-1 justify-between">
                    <span className="flex items-center gap-2">
                      <Paintbrush className="h-4 w-4 text-cyan-400" />
                      <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300">Whiteboard Canvas</h2>
                    </span>
                    <button
                      onClick={() => setWhiteboardFullscreen(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass-button text-[10px] text-slate-400 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 transition-all"
                      title="Fullscreen Whiteboard"
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Fullscreen</span>
                    </button>
                  </div>
                  {provider && (
                    <Whiteboard
                      yDoc={yDoc}
                      provider={provider}
                    />
                  )}
                </section>
              )
            )}
          </main>

          {/* Floating Action Button (FAB) for Toggleable Whiteboard */}
          <button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full glass-panel border border-violet-500/30 hover:border-violet-500/60 shadow-2xl hover:scale-110 cursor-pointer text-violet-400 hover:text-violet-300 transition-all duration-300 z-50 group hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            title={showWhiteboard ? 'Close Whiteboard' : 'Open Whiteboard'}
          >
            <div className="relative">
              <Paintbrush className={`h-6 w-6 transition-transform duration-500 ${showWhiteboard ? 'rotate-45' : ''}`} />
              {/* Subtle glowing ring */}
              <div className="absolute inset-0 -m-2 rounded-full border border-violet-500/20 blur-sm scale-110 animate-ping opacity-60 pointer-events-none" />
            </div>
            {/* Floating tooltip */}
            <span className="absolute right-16 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
              {showWhiteboard ? 'Hide Canvas' : 'Show Canvas'}
            </span>
          </button>
        </>
      )}
    </div>
  )
}

export default App
