import axios from '../api/axios';

/**
 * AI Service
 * Handles all AI-related API calls
 * Automatically routes to correct endpoint based on user role
 */

export interface AIQueryRequest {
  message: string;
  conversationId?: string;
}

export interface AIQueryResponse {
  response: string;
  conversationId?: string;
  tokensUsed: number;
  responseTime: number;
  dataContext?: {
    salesRecords: number;
    inventoryItems: number;
    customers: number;
  };
  branch?: string;
}

export interface AIUsageResponse {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  lastMessageAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }[];
}

class AIService {
  /**
   * Send query to AI (auto-detects admin vs manager endpoint)
   */
  async sendQuery(
    message: string,
    userRole: 'MANAGER' | 'ADMIN' | 'OWNER',
    conversationId?: string
  ): Promise<AIQueryResponse> {
    const endpoint =
      userRole === 'MANAGER' ? '/manager-ai/query' : '/admin-ai/query';

    const response = await axios.post<AIQueryResponse>(endpoint, {
      message,
      conversationId: userRole !== 'MANAGER' ? conversationId : undefined,
    });

    return response.data;
  }

  /**
   * Get AI usage statistics
   */
  async getUsage(userRole: 'MANAGER' | 'ADMIN' | 'OWNER'): Promise<AIUsageResponse> {
    const endpoint =
      userRole === 'MANAGER' ? '/manager-ai/usage' : '/admin-ai/usage';

    const response = await axios.get<AIUsageResponse>(endpoint);
    return response.data;
  }

  // ========================================
  // ADMIN-ONLY METHODS
  // ========================================

  /**
   * Get conversation history (Admin only)
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await axios.get<{ conversations: Conversation[] }>(
      '/admin-ai/conversations'
    );
    return response.data.conversations;
  }

  /**
   * Get specific conversation with messages (Admin only)
   */
  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const response = await axios.get<{ conversation: ConversationDetail }>(
      `/admin-ai/conversations/${conversationId}`
    );
    return response.data.conversation;
  }

  /**
   * Create new conversation (Admin only)
   */
  async createConversation(title?: string): Promise<Conversation> {
    const response = await axios.post<{ conversation: Conversation }>(
      '/admin-ai/conversations',
      { title }
    );
    return response.data.conversation;
  }

  /**
   * Delete conversation (Admin only)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await axios.delete(`/admin-ai/conversations/${conversationId}`);
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
