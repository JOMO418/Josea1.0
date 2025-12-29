// Quick API test - Run with: node test-api.js
// This will call the Command Center API and show what it returns

const http = require('http');

// You'll need to replace this token with a valid one from your browser
// Open DevTools > Application > Local Storage > token
const TOKEN = 'YOUR_TOKEN_HERE';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/mission-control',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
};

console.log('\n🌐 Testing Command Center API...\n');
console.log('URL: http://localhost:5000/api/admin/mission-control');
console.log('Method: GET\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);

    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(data);
        console.log('✅ SUCCESS! API Response:\n');
        console.log(JSON.stringify(parsed, null, 2));

        console.log('\n📊 DATA SUMMARY:');
        console.log(`  - Today Revenue: ${parsed.vitals?.todayRevenue || 0}`);
        console.log(`  - Chart Data Points: ${parsed.chartData?.length || 0}`);
        console.log(`  - Branch Performance: ${parsed.branchPerformance?.length || 0}`);
        console.log(`  - Recent Activity: ${parsed.recentActivity?.length || 0}`);

        if (parsed.chartData && parsed.chartData.length > 0) {
          console.log('\n📈 Chart Data Sample:');
          console.log(parsed.chartData.slice(0, 3));
        }
      } catch (e) {
        console.error('❌ Error parsing JSON:', e.message);
        console.log('Raw response:', data);
      }
    } else {
      console.error(`❌ ERROR: ${res.statusCode}`);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\nMake sure:');
  console.log('1. Server is running on port 5000');
  console.log('2. You updated TOKEN in this file');
});

req.end();
