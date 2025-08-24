const http = require('http');

async function measureResponseTime(url, method = 'GET') {
  return new Promise((resolve) => {
    const start = Date.now();
    const options = {
      hostname: 'localhost',
      port: 3010,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const end = Date.now();
        const responseTime = end - start;
        resolve({
          url,
          method,
          status: res.statusCode,
          responseTime,
          size: Buffer.byteLength(data)
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        url,
        method,
        error: err.message,
        responseTime: -1
      });
    });

    req.end();
  });
}

async function runPerformanceTests() {
  console.log('🚀 パフォーマンステスト開始\n');
  console.log('=' .repeat(50));

  const endpoints = [
    { url: '/api/contacts?page=1&limit=20', method: 'GET', name: 'Contacts API (Paginated)' },
    { url: '/api/contacts?search=test', method: 'GET', name: 'Contacts Search API' },
    { url: '/api/statistics', method: 'GET', name: 'Statistics API' },
    { url: '/api/tags', method: 'GET', name: 'Tags API' },
    { url: '/api/groups', method: 'GET', name: 'Groups API' },
    { url: '/api/reminders', method: 'GET', name: 'Reminders API' },
  ];

  const results = [];
  
  // 各エンドポイントを3回テスト
  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing: ${endpoint.name}`);
    const times = [];
    
    for (let i = 0; i < 3; i++) {
      const result = await measureResponseTime(endpoint.url, endpoint.method);
      times.push(result.responseTime);
      
      if (result.error) {
        console.log(`  ❌ Attempt ${i + 1}: Error - ${result.error}`);
      } else {
        console.log(`  ✅ Attempt ${i + 1}: ${result.responseTime}ms (${result.size} bytes)`);
      }
      
      // 短い待機時間
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 平均を計算
    const validTimes = times.filter(t => t > 0);
    if (validTimes.length > 0) {
      const avg = Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length);
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        avgTime: avg,
        attempts: validTimes.length
      });
    }
  }
  
  // 結果サマリー
  console.log('\n' + '=' .repeat(50));
  console.log('📊 パフォーマンステスト結果サマリー\n');
  
  results.sort((a, b) => a.avgTime - b.avgTime);
  
  results.forEach((result, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    const performance = 
      result.avgTime < 50 ? '⚡ Excellent' :
      result.avgTime < 100 ? '✅ Good' :
      result.avgTime < 200 ? '⚠️ Average' :
      '🐌 Slow';
    
    console.log(`${emoji} ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   平均応答時間: ${result.avgTime}ms ${performance}`);
    console.log('');
  });
  
  const overallAvg = Math.round(results.reduce((a, b) => a + b.avgTime, 0) / results.length);
  console.log('=' .repeat(50));
  console.log(`🎯 全体平均応答時間: ${overallAvg}ms`);
  
  // パフォーマンス評価
  if (overallAvg < 100) {
    console.log('🌟 優秀なパフォーマンス！');
  } else if (overallAvg < 200) {
    console.log('👍 良好なパフォーマンス');
  } else if (overallAvg < 500) {
    console.log('⚠️ パフォーマンス改善の余地あり');
  } else {
    console.log('🔴 パフォーマンス改善が必要');
  }
}

// テスト実行
setTimeout(() => {
  runPerformanceTests().then(() => {
    console.log('\n✨ テスト完了');
    process.exit(0);
  }).catch(err => {
    console.error('テストエラー:', err);
    process.exit(1);
  });
}, 2000); // サーバー起動を待つ