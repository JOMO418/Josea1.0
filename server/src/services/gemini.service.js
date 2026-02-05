const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service
 * Handles all communication with Google's Gemini API
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;

    if (!this.apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('GEMINI_API_KEY not configured in environment variables');
    }

    // Initialize Google Generative AI client
    this.genAI = new GoogleGenerativeAI(this.apiKey);

    // Configure the model
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 8000,
        temperature: 0.7, // Balanced between creativity and accuracy
        topP: 0.95,
        topK: 40,
      },
    });

    console.log('✅ Gemini AI Service initialized successfully');
  }

  /**
   * Generate AI response with system prompt and conversation history
   * @param {string} systemPrompt - System instructions for the AI
   * @param {string} userMessage - User's query
   * @param {Array} conversationHistory - Previous messages [{role: 'user'|'assistant', content: string}]
   * @returns {Promise<Object>} Response object with text, tokens, and timing
   */
  async generateResponse(systemPrompt, userMessage, conversationHistory = []) {
    try {
      const startTime = Date.now();

      // Build message history for context
      const history = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Add system prompt as the first message if there's no history
      if (history.length === 0 && systemPrompt) {
        history.unshift({
          role: 'user',
          parts: [{ text: 'System context: ' + systemPrompt }],
        });
        history.push({
          role: 'model',
          parts: [{ text: 'Understood. I will follow these guidelines.' }],
        });
      }

      // Create chat session with history only
      const chat = this.model.startChat({
        history,
      });

      // Send message and get response
      const result = await chat.sendMessage(userMessage);
      const response = result.response;
      const text = response.text();

      // Calculate metrics
      const responseTimeMs = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(userMessage + text + systemPrompt);

      return {
        text,
        tokensUsed,
        responseTimeMs,
        successful: true,
      };
    } catch (error) {
      console.error('❌ Gemini API Error:', error.message);

      // Handle specific error types with user-friendly messages
      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('Daily AI quota reached. The system will reset at midnight or contact your administrator to upgrade the plan.');
      }

      if (error.message?.includes('API key') || error.message?.includes('API_KEY_INVALID')) {
        throw new Error('AI service configuration error. Please contact your administrator.');
      }

      if (error.message?.includes('SAFETY')) {
        throw new Error('Your query was blocked by safety filters. Please rephrase your question professionally.');
      }

      if (error.message?.includes('RECITATION')) {
        throw new Error('Response blocked due to content policy. Please try a different query.');
      }

      if (error.message?.includes('429')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }

      // Generic error
      throw new Error('AI service temporarily unavailable. Please try again in a moment.');
    }
  }

  /**
   * Estimate token count (rough approximation)
   * Rule of thumb: ~4 characters = 1 token for English
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // More accurate estimation: count words and characters
    const words = text.split(/\s+/).length;
    const chars = text.length;
    // Average: 1 token ≈ 4 chars or 0.75 words
    return Math.ceil(Math.max(chars / 4, words / 0.75));
  }

  /**
   * Test API connection and validate API key
   * @returns {Promise<Object>} Status object
   */
  async testConnection() {
    try {
      console.log('🔍 Testing Gemini API connection...');

      const result = await this.model.generateContent('Hello! Please respond with "Connection successful"');
      const response = result.response;
      const text = response.text();

      console.log('✅ Gemini API connection successful');
      console.log('📝 Test response:', text.substring(0, 100) + '...');

      return {
        success: true,
        message: 'Gemini API connected successfully',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      };
    } catch (error) {
      console.error('❌ Gemini API connection test failed:', error.message);

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Generate a simple response without conversation history (for testing)
   * @param {string} prompt - Single prompt to send
   * @returns {Promise<string>} Response text
   */
  async simpleGenerate(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('❌ Simple generation error:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new GeminiService();
