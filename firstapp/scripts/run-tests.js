// SanScan総合テストスクリプト
const BASE_URL = 'http://localhost:3010';

async function runTests() {
  console.log('🧪 SanScan総合テスト開始\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // テスト実行関数
  async function test(name, testFn) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      results.passed++;
      results.tests.push({ name, status: 'passed' });
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  // 1. ホームページテスト
  console.log('\n📋 1. ホームページテスト');
  await test('TC-HP-001: ページが正常に読み込まれること', async () => {
    const res = await fetch(BASE_URL);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // 2. 連絡先管理機能テスト
  console.log('\n📋 2. 連絡先管理機能テスト');
  await test('TC-CL-001: 連絡先一覧APIが正常に動作すること', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.data || !data.pagination) throw new Error('Invalid response structure');
  });

  await test('TC-CC-005: 連絡先が正常に保存されること', async () => {
    const testData = {
      fullName: 'テストユーザー' + Date.now(),
      email: `test${Date.now()}@example.com`,
      phone: '090-' + Math.floor(Math.random() * 10000000).toString().padStart(8, '0'),
      companyName: 'テスト会社' + Date.now()
    };
    
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (res.status !== 201) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.id) throw new Error('No ID returned');
  });

  // 3. 検索・フィルタ機能テスト
  console.log('\n📋 3. 検索・フィルタ機能テスト');
  await test('TC-BS-001: 氏名による検索が正常に動作すること', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?search=荒井`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.data)) throw new Error('Invalid response');
  });

  await test('TC-AS-001: 電話番号ありフィルタが動作すること', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?hasPhone=1`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // 4. OCR機能テスト
  console.log('\n📋 4. OCR機能テスト');
  await test('TC-OCR-001: OCR APIエンドポイントが存在すること', async () => {
    const res = await fetch(`${BASE_URL}/api/ocr/upload`, { method: 'POST' });
    // ファイルなしでもエンドポイントは応答するはず
    if (res.status === 404) throw new Error('Endpoint not found');
  });

  // 5. 統計ダッシュボードテスト
  console.log('\n📋 5. 統計ダッシュボードテスト');
  await test('TC-DASH-001: ダッシュボードページが読み込まれること', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  await test('TC-STAT-001: 統計APIが正常に動作すること', async () => {
    const res = await fetch(`${BASE_URL}/api/statistics`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.overview) throw new Error('No overview data');
  });

  // 6. リマインダー機能テスト
  console.log('\n📋 6. リマインダー機能テスト');
  await test('TC-REM-001: リマインダーAPIが正常に動作すること', async () => {
    const res = await fetch(`${BASE_URL}/api/reminders`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.reminders || !data.stats) throw new Error('Invalid response structure');
  });

  // 7. ネットワーク分析機能テスト
  console.log('\n📋 7. ネットワーク分析機能テスト');
  await test('TC-NET-001: ネットワーク分析APIが正常に動作すること', async () => {
    const res = await fetch(`${BASE_URL}/api/network`);
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (!data.nodes || !data.links) throw new Error('Invalid response structure');
  });

  // 8. データ整合性テスト
  console.log('\n📋 8. データ整合性テスト');
  await test('TC-DATA-001: 総データ数が0以上であること', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`);
    const data = await res.json();
    if (data.pagination.total < 0) throw new Error('Negative total count');
  });

  await test('TC-DATA-002: ページネーションが正しく計算されること', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?page=1&limit=10`);
    const data = await res.json();
    const expectedPages = Math.ceil(data.pagination.total / 10);
    if (data.pagination.totalPages !== expectedPages) {
      throw new Error(`Expected ${expectedPages} pages, got ${data.pagination.totalPages}`);
    }
  });

  // 9. パフォーマンステスト
  console.log('\n📋 9. パフォーマンステスト');
  await test('TC-PP-001: API応答時間が3秒以内であること', async () => {
    const start = Date.now();
    await fetch(`${BASE_URL}/api/contacts`);
    const elapsed = Date.now() - start;
    if (elapsed > 3000) throw new Error(`Response took ${elapsed}ms`);
  });

  // 10. エラーハンドリングテスト
  console.log('\n📋 10. エラーハンドリングテスト');
  await test('TC-ERR-001: 不正なAPIリクエストで適切なエラーが返ること', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // fullNameなし
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // テスト結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${results.passed}件`);
  console.log(`❌ 失敗: ${results.failed}件`);
  console.log(`📈 成功率: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ 失敗したテスト:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }
  
  console.log('\n✨ テスト完了');
  process.exit(results.failed > 0 ? 1 : 0);
}

// テスト実行
runTests().catch(error => {
  console.error('テスト実行エラー:', error);
  process.exit(1);
});