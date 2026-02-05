import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  Download,
  RotateCcw,
  Maximize2,
  Minimize2,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '../../services/ai.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'MANAGER' | 'ADMIN' | 'OWNER';
  userName: string;
  branchId?: string;
  branchName?: string;
  externalConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

/**
 * Josea AI Chat Interface - Professional Edition
 * Clean, minimal, confidence-inspiring design
 * Enterprise-grade UI with subtle purple accents
 */
export default function AIChatInterface({
  isOpen,
  onClose,
  userRole,
  userName,
  branchId: _branchId,
  branchName,
  externalConversationId,
  onConversationChange,
  onToggleSidebar,
  isSidebarOpen = false,
}: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load conversation messages
  useEffect(() => {
    if (externalConversationId && userRole !== 'MANAGER') {
      loadConversation(externalConversationId);
    } else if (externalConversationId === null) {
      handleClearChat();
    }
  }, [externalConversationId]);

  const loadConversation = async (convId: string) => {
    try {
      setIsLoading(true);
      const conversation = await aiService.getConversation(convId);
      const loadedMessages: Message[] = conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loadedMessages);
      setConversationId(convId);
      setError(null);
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      toast.error('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const data = await aiService.sendQuery(
        inputMessage,
        userRole,
        conversationId || undefined
      );

      if (userRole !== 'MANAGER' && data.conversationId) {
        setConversationId(data.conversationId);
        onConversationChange?.(data.conversationId);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('AI query error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to get AI response';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    onConversationChange?.(null);
  };

  const handleExport = () => {
    const text = messages
      .map((m) => `[${m.role.toUpperCase()}] ${m.timestamp.toLocaleString()}\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `josea-ai-${Date.now()}.txt`;
    a.click();
    toast.success('Conversation exported');
  };

  if (!isOpen) return null;

  const width = isFullscreen ? '100vw' : '600px';
  const height = isFullscreen ? '100vh' : '82vh';
  const maxHeight = isFullscreen ? '100vh' : '740px';
  const position = isFullscreen ? 'fixed inset-0' : 'fixed bottom-6 right-6';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={`${position} bg-slate-950 border border-slate-800/50 flex flex-col z-[999] ${
          isFullscreen ? '' : 'rounded-xl shadow-2xl'
        }`}
        style={{ width, height, maxHeight }}
      >
        {/* Clean Professional Header */}
        <div className="flex-none border-b border-slate-800/50 bg-slate-950/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle (Admin Only) */}
              {userRole !== 'MANAGER' && !isFullscreen && (
                <button
                  onClick={onToggleSidebar}
                  className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
                  title={isSidebarOpen ? 'Close history' : 'Open history'}
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Title */}
              <div>
                <h2 className="text-white text-sm font-semibold">
                  Josea AI
                </h2>
                <p className="text-slate-500 text-xs">
                  {userRole === 'MANAGER'
                    ? `${branchName} Assistant`
                    : 'Business Intelligence'}
                </p>
              </div>
            </div>

            {/* Professional Action Buttons */}
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Export conversation"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Clear conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </>
              )}

              {/* Sophisticated Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  isFullscreen
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Expand</span>
                  </>
                )}
              </button>

              {/* Sophisticated Close Button */}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors flex items-center gap-1.5"
                title="Close Josea AI"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <>
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  {/* Sophisticated "J" Welcome */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 flex items-center justify-center mb-6 shadow-xl">
                    <span className="font-serif text-3xl font-bold text-purple-400">J</span>
                  </div>

                  {/* Professional Resonating Statement */}
                  {userRole !== 'MANAGER' && (
                    <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
                      Enterprise Intelligence
                    </p>
                  )}

                  <h3 className="text-white text-lg font-semibold mb-2">
                    Welcome, {userName}
                  </h3>

                  {/* Professional Directive Statement */}
                  <p className="text-slate-300 text-sm max-w-md leading-relaxed mb-1 font-medium">
                    {userRole === 'MANAGER'
                      ? `Your intelligent assistant for ${branchName}.`
                      : 'Your intelligent business analyst at your command.'}
                  </p>

                  <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
                    {userRole === 'MANAGER'
                      ? 'Ask about daily operations, sales performance, inventory status, or customer insights.'
                      : 'Get instant answers about sales, inventory, customers, branch performance, and operational metrics across your entire business.'}
                  </p>

                  {/* Sophisticated Josea Branding */}
                  <div className="mt-8 relative">
                    {/* Glowing Background Effect */}
                    <div className="absolute inset-0 bg-purple-500/10 blur-xl rounded-full animate-pulse"></div>

                    {/* Brand Container */}
                    <div className="relative bg-gradient-to-r from-slate-900 via-purple-900/20 to-slate-900 border border-purple-500/30 rounded-xl px-8 py-3.5 shadow-xl">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        {/* Brand Text */}
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Powered by
                        </span>
                        <span className="text-base font-bold bg-gradient-to-r from-purple-400 via-purple-300 to-purple-400 bg-clip-text text-transparent">
                          Josea Software Solutions
                        </span>
                      </div>

                      {/* Subtle Glow Line */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="font-serif text-sm font-bold text-purple-400">J</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span className="text-sm">Analyzing your request...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-200">Error</p>
                    <p className="text-sm text-red-300/80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Professional Input Area */}
            <div className="flex-none border-t border-slate-800/50 bg-slate-950 p-4">
              <div className="flex gap-2.5">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a question..."
                  rows={1}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none text-sm leading-relaxed shadow-inner"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-xl transition-all text-sm font-medium flex-shrink-0 shadow-lg hover:shadow-purple-500/20 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>
                    {userRole === 'MANAGER'
                      ? `${branchName} • Last 14 days`
                      : 'Full business access'}
                  </span>
                </div>
                <span className="text-xs text-slate-600">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">Enter</kbd> to send
                </span>
              </div>
            </div>
          </>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Professional Message Bubble
 */
function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          <div className="bg-purple-600 text-white rounded-xl px-4 py-3 shadow-lg">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1.5">
            <p className="text-xs text-slate-600">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {/* Sophisticated "J" Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 flex items-center justify-center flex-shrink-0 shadow-md">
        <span className="font-serif text-sm font-bold text-purple-400">J</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 group relative shadow-lg">
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownContent content={message.content} />
          </div>
          {/* Professional Copy Button */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white text-xs font-medium"
            title="Copy"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-xs text-slate-600">
            {message.timestamp.toLocaleTimeString()}
          </p>
          <span className="text-xs text-slate-700">•</span>
          <p className="text-xs text-slate-600">Josea AI</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Professional Markdown Renderer
 */
function MarkdownContent({ content }: { content: string }) {
  const parseMarkdown = (text: string) => {
    // Handle tables
    if (text.includes('|')) {
      const lines = text.split('\n');
      const tableLines = lines.filter((line) => line.trim().startsWith('|'));

      if (tableLines.length > 0) {
        return (
          <div className="overflow-x-auto my-4 rounded-lg border border-slate-800">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {tableLines.map((line, idx) => {
                  const cells = line
                    .split('|')
                    .filter((cell) => cell.trim())
                    .map((cell) => cell.trim());

                  if (cells.every((cell) => cell.match(/^[-:]+$/))) return null;

                  return (
                    <tr key={idx} className={idx === 0 ? 'bg-slate-800/50' : ''}>
                      {cells.map((cell, cellIdx) => {
                        const Tag = idx === 0 ? 'th' : 'td';
                        return (
                          <Tag
                            key={cellIdx}
                            className={`px-4 py-2.5 text-left ${
                              idx === 0
                                ? 'font-semibold text-white text-xs uppercase'
                                : 'text-slate-300'
                            }`}
                          >
                            {cell}
                          </Tag>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Handle bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');

    // Handle lists
    if (text.includes('\n- ')) {
      const parts = text.split('\n- ');
      return (
        <div>
          <p className="text-slate-200">{parts[0]}</p>
          <ul className="space-y-1 mt-2 ml-4">
            {parts.slice(1).map((item, idx) => (
              <li key={idx} className="text-slate-300 list-disc">
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return <p dangerouslySetInnerHTML={{ __html: text }} className="whitespace-pre-wrap text-slate-200" />;
  };

  return <div>{parseMarkdown(content)}</div>;
}
