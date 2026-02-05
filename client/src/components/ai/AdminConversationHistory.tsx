import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { aiService } from '../../services/ai.service';

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
}

interface AdminConversationHistoryProps {
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  activeConversationId: string | null;
}

/**
 * Professional Conversation History Sidebar
 * Clean, minimal design
 */
export default function AdminConversationHistory({
  onConversationSelect,
  onNewConversation,
  activeConversationId,
}: AdminConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const conversations = await aiService.getConversations();
      setConversations(conversations || []);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this conversation?')) {
      return;
    }

    try {
      setDeletingId(conversationId);
      await aiService.deleteConversation(conversationId);
      toast.success('Deleted');
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      if (conversationId === activeConversationId) {
        onNewConversation();
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* New Conversation Button */}
      <button
        onClick={onNewConversation}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        New Chat
      </button>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="text-center py-12 px-4">
          <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No history yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 px-2 uppercase tracking-wider">
            Recent
          </p>
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onConversationSelect(conversation.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group relative ${
                activeConversationId === conversation.id
                  ? 'bg-slate-800 text-white'
                  : 'hover:bg-slate-900 text-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate mb-1">
                    {conversation.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{conversation.messageCount} msgs</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(conversation.id, e)}
                  disabled={deletingId === conversation.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400"
                  title="Delete"
                >
                  {deletingId === conversation.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Active Indicator */}
              {activeConversationId === conversation.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
