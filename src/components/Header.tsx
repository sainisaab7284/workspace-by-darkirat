import React, { useState } from 'react'
import { Users, Check, Copy, Layers, LogOut } from 'lucide-react'

interface ActiveUser {
  name: string
  color: string
  id: string | number
}

interface HeaderProps {
  roomId: string
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  users: ActiveUser[]
  currentUser: { name: string; color: string }
  onCopyRoomLink: () => void
  onLeave: () => void
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  connectionStatus,
  users,
  currentUser,
  onCopyRoomLink,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopyRoomLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Get status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
      case 'connecting':
        return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse'
      case 'disconnected':
      default:
        return 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
    }
  }

  return (
    <header className="glass-panel sticky top-0 z-50 flex h-16 items-center justify-between px-6 py-4 rounded-xl mx-4 mt-4">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/30">
          <Layers className="h-5 w-5 text-violet-400 text-glow-indigo" />
          <div className="absolute inset-0 rounded-lg bg-violet-500/20 blur-sm -z-10 animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent m-0 leading-none lowercase">
            workspace
          </h1>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
            by darkirat
          </span>
        </div>
      </div>

      {/* Room link & connection status */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/5 text-xs text-slate-300">
          <span className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
          <span className="capitalize font-medium">{connectionStatus}</span>
        </div>

        {/* Room ID Badge */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-900/60 border border-white/5 p-1 text-xs">
          <span className="px-2.5 text-slate-400 font-mono">Room: {roomId}</span>
          <button
            onClick={handleCopy}
            className="glass-button flex h-7 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white"
            title="Copy Invite Link"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Invite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* User presence */}
      <div className="flex items-center gap-3">
        {/* Avatars */}
        <div className="flex items-center -space-x-2">
          {users.slice(0, 4).map((user) => (
            <div
              key={user.id}
              className="relative group cursor-default"
              style={{ zIndex: 10 }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white border-2 border-[#030014] shadow-md transition-transform hover:-translate-y-1 hover:scale-105"
                style={{ backgroundColor: user.color }}
              >
                {getInitials(user.name)}
              </div>
              
              {/* Tooltip */}
              <div className="absolute right-1/2 translate-x-1/2 top-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-950 border border-white/10 text-[10px] text-white px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                {user.name} {user.name === currentUser.name ? '(You)' : ''}
              </div>
            </div>
          ))}

          {users.length > 4 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border-2 border-[#030014] text-xs font-semibold text-slate-300">
              +{users.length - 4}
            </div>
          )}
        </div>

        {/* User Count Badge */}
        <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1.5 text-xs text-violet-300">
          <Users className="h-3.5 w-3.5" />
          <span className="font-bold">{users.length}</span>
        </div>

        {/* Leave Button */}
        <button
          onClick={onLeave}
          className="glass-button flex h-9 px-3 items-center gap-1.5 rounded-lg text-xs font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/40"
          title="Leave Workspace"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  )
}
