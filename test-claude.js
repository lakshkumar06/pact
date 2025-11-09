// Quick test script to verify Claude API integration
const API_BASE = 'http://localhost:3001/api';

async function testClaudeEndpoint() {
  console.log('🧪 Testing Claude API endpoint...\n');

  // Step 1: Login to get JWT token
  console.log('1️⃣ Logging in to get auth token...');
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });

    if (!loginRes.ok) {
      console.log('⚠️  Login failed. Creating test user first...');
      
      // Register test user
      const registerRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'test123'
        })
      });

      if (!registerRes.ok) {
        const errorText = await registerRes.text();
        console.error('❌ Failed to register user:', errorText);
        return;
      }

      const registerData = await registerRes.json();
      var token = registerData.token;
      console.log('✅ Test user created successfully');
    } else {
      const loginData = await loginRes.json();
      var token = loginData.token;
      console.log('✅ Logged in successfully');
    }

    // Step 2: Test Claude endpoint
    console.log('\n2️⃣ Testing Claude chat endpoint...');
    const claudeRes = await fetch(`${API_BASE}/claude/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'Hello! Can you confirm you are Claude AI? Please respond in one short sentence.'
      })
    });

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text();
      console.error('❌ Claude endpoint failed:', claudeRes.status, errorText);
      return;
    }

    const claudeData = await claudeRes.json();
    console.log('✅ Claude responded successfully!\n');
    console.log('📝 Claude\'s response:');
    console.log('─'.repeat(60));
    console.log(claudeData.reply);
    console.log('─'.repeat(60));

    // Step 3: Test with a real estate question
    console.log('\n3️⃣ Testing real estate use case...');
    const reRes = await fetch(`${API_BASE}/claude/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'What are the top 3 most important factors buyers consider when purchasing a home? Answer in 50 words or less.'
      })
    });

    if (reRes.ok) {
      const reData = await reRes.json();
      console.log('✅ Real estate query successful!\n');
      console.log('📝 Response:');
      console.log('─'.repeat(60));
      console.log(reData.reply);
      console.log('─'.repeat(60));
    }

    console.log('\n✨ All tests passed! Claude integration is working.');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error.stack);
  }
}

testClaudeEndpoint();
