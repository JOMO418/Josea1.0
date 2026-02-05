// List available Gemini models
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    console.log('🔍 Fetching available models...\n');

    // Try to list models
    const models = await genAI.listModels();

    console.log('✅ Available models:');
    for await (const model of models) {
      console.log(`  - ${model.name}`);
      console.log(`    Display Name: ${model.displayName}`);
      console.log(`    Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    console.log('\n💡 This might mean:');
    console.log('   1. API key is invalid');
    console.log('   2. Gemini API is not enabled in your Google Cloud project');
    console.log('   3. Need to enable the API at: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
  }

  process.exit(0);
}

listModels();
