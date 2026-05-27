import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import * as Y from 'yjs'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Terminal,
  Eraser,
  Play,
  Eye,
  EyeOff,
  Trash,
  Download
} from 'lucide-react'

interface TextEditorProps {
  yDoc: Y.Doc
  provider: any // WebsocketProvider
  currentUser: { name: string; color: string }
}

export const TextEditor: React.FC<TextEditorProps> = ({
  yDoc,
  provider,
  currentUser,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
      } as any),
      Collaboration.configure({
        document: yDoc,
      }),
      CollaborationCaret.configure({
        provider: provider,
        user: {
          name: currentUser.name,
          color: currentUser.color,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-full px-6 py-4 min-h-[500px] text-slate-100',
      },
    },
  })

  // Console output state
  const [consoleMode, setConsoleMode] = React.useState<'none' | 'js' | 'html'>('none')
  const [consoleLogs, setConsoleLogs] = React.useState<string[]>([])
  const [showSaveDropdown, setShowSaveDropdown] = React.useState(false)

  // Download Backup Helper
  const handleSaveFile = (format: 'txt' | 'js' | 'html') => {
    const text = format === 'html' ? editor.getHTML() : editor.getText()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auraflow-code-${Date.now()}.${format}`
    link.click()
    URL.revokeObjectURL(url)
    setShowSaveDropdown(false)
  }

  // JavaScript Runner Helper
  const runJavaScript = () => {
    const code = editor.getText()
    const logs: string[] = []
    
    // Save original console functions
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    
    console.log = (...args) => {
      logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '))
      originalLog(...args)
    }
    console.error = (...args) => {
      logs.push(`🔴 Error: ${args.join(' ')}`)
      originalError(...args)
    }
    console.warn = (...args) => {
      logs.push(`⚠️ Warning: ${args.join(' ')}`)
      originalWarn(...args)
    }

    try {
      const result = new Function(code)()
      if (result !== undefined) {
        logs.push(`➜ ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`)
      }
    } catch (error: any) {
      logs.push(`🔴 Runtime Error: ${error.message}`)
    }

    // Restore original console
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn

    setConsoleLogs(logs.length > 0 ? logs : ['Code executed successfully, but returned no logs.'])
  }

  // HTML Content Parser
  const getHtmlContent = () => {
    const text = editor.getText()
    if (text.trim().startsWith('<') || text.includes('</div>') || text.includes('</body>')) {
      return text
    }
    return editor.getHTML()
  }

  if (!editor) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-2xl glass-panel border border-white/5">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <span className="text-sm text-slate-400">Loading editor node...</span>
        </div>
      </div>
    )
  }

  // Toolbar button helper
  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    children,
    title,
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`glass-button flex h-9 w-9 items-center justify-center rounded-lg p-0 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none ${
        isActive ? 'glass-button-active text-violet-400 font-bold border border-violet-500/30' : ''
      }`}
      title={title}
      type="button"
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-col w-full">
      {/* Editor toolbar */}
      <div className="glass-panel-light flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-white/5 shadow-md mb-4 sticky top-16 z-40 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-1">
          {/* Format Group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Heading Group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Blocks Group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Terminal className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* History / Utility Group */}
        <div className="flex items-center gap-1">
          {/* Code Execution controls */}
          <ToolbarButton
            onClick={() => {
              if (consoleMode === 'js') {
                runJavaScript()
              } else {
                setConsoleMode('js')
                setTimeout(() => runJavaScript(), 50)
              }
            }}
            isActive={consoleMode === 'js'}
            title="Run code as JavaScript"
          >
            <Play className="h-4 w-4 text-emerald-400" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              setConsoleMode(consoleMode === 'html' ? 'none' : 'html')
            }}
            isActive={consoleMode === 'html'}
            title="Preview as HTML Page"
          >
            <Eye className="h-4 w-4 text-cyan-400" />
          </ToolbarButton>

          <div className="h-6 w-px bg-white/10 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              if (confirm('Are you sure you want to clear all editor contents?')) {
                editor.commands.clearContent()
              }
            }}
            title="Clear Editor"
          >
            <Eraser className="h-4 w-4 text-rose-400 hover:text-rose-300" />
          </ToolbarButton>

          {/* Save / Export Button */}
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowSaveDropdown(!showSaveDropdown)}
              isActive={showSaveDropdown}
              title="Save/Export Document"
            >
              <Download className="h-4 w-4 text-violet-400" />
            </ToolbarButton>
            
            {showSaveDropdown && (
              <div className="absolute right-0 mt-2 w-44 glass-panel rounded-xl border border-white/10 shadow-2xl p-1 bg-slate-950/90 z-50">
                <button
                  onClick={() => handleSaveFile('txt')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Save as Text (.txt)</span>
                </button>
                <button
                  onClick={() => handleSaveFile('js')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Save as Script (.js)</span>
                </button>
                <button
                  onClick={() => handleSaveFile('html')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Save as HTML (.html)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="glass-panel rounded-2xl border border-white/8 shadow-2xl relative min-h-[520px] transition-all hover:border-white/15 focus-within:border-violet-500/40 focus-within:shadow-[0_0_25px_rgba(139,92,246,0.15)] bg-slate-950/40 backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        <EditorContent editor={editor} />
        
        {/* Editor Info Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 text-[11px] text-slate-400">
          <span>Active document synced in real-time</span>
          <span>{editor.storage.characterCount?.words?.() || 0} words</span>
        </div>
      </div>

      {/* Console Output Panel */}
      {consoleMode !== 'none' && (
        <div className="glass-panel rounded-2xl border border-white/8 mt-4 overflow-hidden shadow-2xl bg-slate-950/60 backdrop-blur-xl">
          {/* Console Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-slate-900/40 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-violet-400" />
              <span>{consoleMode === 'js' ? 'JavaScript Execution Console' : 'HTML Live Render Output'}</span>
            </span>
            <div className="flex items-center gap-1.5">
              {consoleMode === 'js' && (
                <button
                  onClick={runJavaScript}
                  className="glass-button flex h-7 px-2.5 items-center gap-1 rounded text-[10px] text-emerald-400 border border-emerald-500/20"
                  title="Re-run code"
                >
                  <Play className="h-3 w-3" />
                  <span>Rerun</span>
                </button>
              )}
              <button
                onClick={() => setConsoleLogs([])}
                className="glass-button flex h-7 px-2.5 items-center gap-1 rounded text-[10px] text-slate-400"
                title="Clear Logs"
              >
                <Trash className="h-3 w-3" />
                <span>Clear</span>
              </button>
              <button
                onClick={() => setConsoleMode('none')}
                className="glass-button flex h-7 px-2.5 items-center gap-1 rounded text-[10px] text-rose-400 border border-rose-500/20 animate-pulse"
                title="Close Panel"
              >
                <EyeOff className="h-3 w-3" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Console Body */}
          <div className="p-4 bg-black/45 min-h-[150px] max-h-[300px] overflow-y-auto font-mono text-xs">
            {consoleMode === 'js' ? (
              <div className="space-y-1.5 select-text selection:bg-violet-500/30">
                {consoleLogs.map((log, idx) => {
                  let logClass = 'text-slate-300'
                  if (log.startsWith('🔴')) logClass = 'text-rose-400 font-bold'
                  else if (log.startsWith('⚠️')) logClass = 'text-amber-400'
                  else if (log.startsWith('➜')) logClass = 'text-cyan-400'
                  
                  return (
                    <div key={idx} className={`${logClass} whitespace-pre-wrap`}>
                      {log}
                    </div>
                  )
                })}
                {consoleLogs.length === 0 && (
                  <span className="text-slate-500 italic">No output logs. Click "Rerun" or type code to view output.</span>
                )}
              </div>
            ) : (
              /* HTML Preview in sandboxed iframe */
              <iframe
                title="Live HTML Preview"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <style>
                        body {
                          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          color: #cbd5e1;
                          background-color: #0b0f19;
                          margin: 1rem;
                          line-height: 1.5;
                        }
                        h1, h2, h3 { color: #ffffff; margin-top: 1rem; }
                        pre { background: #1e293b; padding: 0.75rem; border-radius: 6px; overflow-x: auto; color: #a7f3d0; }
                        code { background: #334155; padding: 0.15rem 0.3rem; border-radius: 4px; color: #f472b6; font-size: 0.9em; }
                      </style>
                    </head>
                    <body>
                      ${getHtmlContent()}
                    </body>
                  </html>
                `}
                sandbox="allow-scripts"
                className="w-full min-h-[200px] border-0 bg-slate-950 rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
