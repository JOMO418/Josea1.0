// Quick test script for Gemini service
require('dotenv').config();
const geminiService = require('./src/services/gemini.service');

async function testGemini() {
  console.log('🚀 Testing Gemini AI Service...\n');

  try {
    // Test 1: Connection test
    const connectionTest = await geminiService.testConnection();
    console.log('\n📊 Connection Test Result:', connectionTest);

    if (connectionTest.success) {
      // Test 2: Simple query
      console.log('\n🧪 Testing simple query...');
      const response = await geminiService.simpleGenerate('Say hello in one sentence');
      console.log('✅ Response:', response);

      console.log('\n✅ All tests passed! Gemini AI is ready.');
    } else {
      console.log('\n❌ Connection test failed. Please check your API key.');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  process.exit(0);
}

testGemini();
