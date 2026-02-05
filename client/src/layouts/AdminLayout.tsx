// ============================================
// ADMIN LAYOUT - MASTERPIECE INTEGRATION
// Complete Admin Shell with Josea Branding
// ============================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/layouts/AdminSidebar';
import AdminHeader from '../components/layouts/AdminHeader';
import AIFloatingButton from '../components/ai/AIFloatingButton';
import AIChatInterface from '../components/ai/AIChatInterface';
import AdminConversationHistory from '../components/ai/AdminConversationHistory';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';

export default function AdminLayout() {
  const userName = useStore((state) => state.userName);
  const userRole = useStore((state) => state.userRole);

  // AI Chat State
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConversationHistory, setShowConversationHistory] = useState(false); // Closed by default

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
  };

  const handleToggleSidebar = () => {
    setShowConversationHistory(!showConversationHistory);
  };
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans selection:bg-amber-500/30">
      {/* ===== THE "SCIFI" SIDEBAR ===== */}
      <AdminSidebar />

      {/* ===== MAIN CONTENT COLUMN ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ===== THE "GLASS COMMAND" HEADER ===== */}
        <AdminHeader />

        {/* ===== MAIN CONTENT AREA ===== */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* ===== JOSEA AI ASSISTANT (ADMIN) ===== */}
      <AIFloatingButton
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        userRole={userRole || 'ADMIN'}
        isOpen={isAIChatOpen}
      />

      {/* Conversation History Sidebar (Admin Only) - Professional Design */}
      {isAIChatOpen && showConversationHistory && userRole !== 'MANAGER' && (
        <div
          className="fixed bottom-6 right-[600px] w-72 bg-slate-950 border border-slate-800/50 rounded-xl shadow-2xl flex flex-col z-[999] overflow-hidden"
          style={{
            height: '80vh',
            maxHeight: '720px',
          }}
        >
          {/* Clean Header */}
          <div className="flex-none border-b border-slate-800/50 bg-slate-950">
            <div className="flex items-center justify-between px-4 h-12">
              <h3 className="text-white text-sm font-semibold">History</h3>
              <button
                onClick={() => setShowConversationHistory(false)}
                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-4">
            <AdminConversationHistory
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              activeConversationId={activeConversationId}
            />
          </div>
        </div>
      )}

      <AIChatInterface
        isOpen={isAIChatOpen}
        onClose={() => {
          setIsAIChatOpen(false);
          setShowConversationHistory(false);
        }}
        userRole={userRole || 'ADMIN'}
        userName={userName || 'Admin'}
        externalConversationId={activeConversationId}
        onConversationChange={setActiveConversationId}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={showConversationHistory}
      />
    </div>
  );
}
