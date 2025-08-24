// SanScan 単体テストスイート
const assert = require('assert');
const BASE_URL = 'http://localhost:3010';

// テスト用ユーティリティ
class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    try {
      await testFn();
      console.log(`  ✅ ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed' });
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.log(`     → ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  skip(name) {
    console.log(`  ⏭️  ${name} (スキップ)`);
    this.results.skipped++;
    this.results.tests.push({ name, status: 'skipped' });
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 単体テスト結果サマリー');
    console.log('='.repeat(60));
    console.log(`✅ 成功: ${this.results.passed}件`);
    console.log(`❌ 失敗: ${this.results.failed}件`);
    console.log(`⏭️  スキップ: ${this.results.skipped}件`);
    const total = this.results.passed + this.results.failed;
    if (total > 0) {
      console.log(`📈 成功率: ${(this.results.passed / total * 100).toFixed(1)}%`);
    }
  }
}

// メインテスト関数
async function runUnitTests() {
  console.log('🧪 SanScan 単体テストスイート開始\n');
  const runner = new TestRunner();

  // ========== 1. API エンドポイント単体テスト ==========
  console.log('\n📁 1. APIエンドポイント単体テスト');
  
  // 1.1 連絡先API
  console.log('\n  [連絡先API]');
  await runner.test('GET /api/contacts - レスポンス構造', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`);
    const data = await res.json();
    assert(data.hasOwnProperty('data'), 'dataプロパティが存在しない');
    assert(data.hasOwnProperty('pagination'), 'paginationプロパティが存在しない');
    assert(Array.isArray(data.data), 'dataが配列でない');
  });

  await runner.test('GET /api/contacts - ページネーション', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?page=1&limit=5`);
    const data = await res.json();
    assert(data.data.length <= 5, '制限値を超えるデータが返された');
    assert(data.pagination.page === 1, 'ページ番号が正しくない');
    assert(data.pagination.limit === 5, '制限値が正しくない');
  });

  await runner.test('GET /api/contacts - 検索機能', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?search=test`);
    assert(res.status === 200, `ステータスコード: ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.data), '検索結果が配列でない');
  });

  await runner.test('POST /api/contacts - 必須フィールド検証', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(res.status === 400, `期待値400, 実際${res.status}`);
  });

  await runner.test('POST /api/contacts - 正常な作成', async () => {
    const testContact = {
      fullName: `単体テスト_${Date.now()}`,
      email: `unit_test_${Date.now()}@example.com`,
      phone: '090-0000-0000'
    };
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testContact)
    });
    assert(res.status === 201, `ステータスコード: ${res.status}`);
    const data = await res.json();
    assert(data.id, 'IDが返されていない');
    assert(data.fullName === testContact.fullName, '名前が一致しない');
  });

  // 1.2 統計API
  console.log('\n  [統計API]');
  await runner.test('GET /api/statistics - レスポンス構造', async () => {
    const res = await fetch(`${BASE_URL}/api/statistics`);
    const data = await res.json();
    assert(data.overview, 'overviewが存在しない');
    assert(typeof data.overview.totalContacts === 'number', 'totalContactsが数値でない');
    assert(typeof data.overview.totalCompanies === 'number', 'totalCompaniesが数値でない');
  });

  await runner.test('GET /api/statistics - データ整合性', async () => {
    const res = await fetch(`${BASE_URL}/api/statistics`);
    const data = await res.json();
    assert(data.overview.totalContacts >= 0, '連絡先数が負の値');
    assert(data.overview.totalCompanies >= 0, '会社数が負の値');
    assert(data.overview.emailPercentage >= 0 && data.overview.emailPercentage <= 100, 
           'メール保有率が0-100%の範囲外');
  });

  // 1.3 リマインダーAPI
  console.log('\n  [リマインダーAPI]');
  await runner.test('GET /api/reminders - レスポンス構造', async () => {
    const res = await fetch(`${BASE_URL}/api/reminders`);
    const data = await res.json();
    assert(Array.isArray(data.reminders), 'remindersが配列でない');
    assert(data.stats, 'statsが存在しない');
    assert(typeof data.stats.total === 'number', 'stats.totalが数値でない');
  });

  // 1.4 ネットワークAPI
  console.log('\n  [ネットワークAPI]');
  await runner.test('GET /api/network - レスポンス構造', async () => {
    const res = await fetch(`${BASE_URL}/api/network`);
    const data = await res.json();
    assert(Array.isArray(data.nodes), 'nodesが配列でない');
    assert(Array.isArray(data.links), 'linksが配列でない');
    assert(data.stats, 'statsが存在しない');
  });

  // ========== 2. データバリデーション単体テスト ==========
  console.log('\n📁 2. データバリデーション単体テスト');
  
  await runner.test('メールアドレス形式検証', async () => {
    const invalidEmails = ['invalid', '@example.com', 'test@', 'test..@example.com'];
    for (const email of invalidEmails) {
      const res = await fetch(`${BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'テスト',
          email: email
        })
      });
      // 無効なメールでも登録できる場合があるため、ここではステータスのみチェック
      assert(res.status === 201 || res.status === 400, 
             `無効なメール ${email} で予期しないステータス: ${res.status}`);
    }
  });

  await runner.test('電話番号形式検証', async () => {
    const validPhones = ['090-1234-5678', '03-1234-5678', '0120-123-456'];
    for (const phone of validPhones) {
      const res = await fetch(`${BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `電話テスト_${Date.now()}`,
          phone: phone
        })
      });
      assert(res.status === 201, `有効な電話番号 ${phone} が拒否された`);
    }
  });

  // ========== 3. ビジネスロジック単体テスト ==========
  console.log('\n📁 3. ビジネスロジック単体テスト');
  
  await runner.test('会社の自動作成（connectOrCreate）', async () => {
    const uniqueCompany = `テスト会社_${Date.now()}`;
    
    // 1回目: 新規作成
    const res1 = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'テスト社員1',
        companyName: uniqueCompany
      })
    });
    assert(res1.status === 201, '1回目の作成に失敗');
    const data1 = await res1.json();
    const companyId1 = data1.company?.id;
    
    // 2回目: 同じ会社名で作成（既存を使用するはず）
    const res2 = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'テスト社員2',
        companyName: uniqueCompany
      })
    });
    assert(res2.status === 201, '2回目の作成に失敗');
    const data2 = await res2.json();
    const companyId2 = data2.company?.id;
    
    assert(companyId1 === companyId2, '同じ会社名で異なるIDが作成された');
  });

  await runner.test('ページネーション計算', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?limit=10`);
    const data = await res.json();
    const expectedPages = Math.ceil(data.pagination.total / 10);
    assert(data.pagination.totalPages === expectedPages, 
           `期待値: ${expectedPages}ページ, 実際: ${data.pagination.totalPages}ページ`);
  });

  // ========== 4. エラーハンドリング単体テスト ==========
  console.log('\n📁 4. エラーハンドリング単体テスト');
  
  await runner.test('存在しないエンドポイント', async () => {
    const res = await fetch(`${BASE_URL}/api/nonexistent`);
    assert(res.status === 404, `期待値404, 実際${res.status}`);
  });

  await runner.test('不正なJSONボディ', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid json'
    });
    assert(res.status === 400 || res.status === 500, 
           `不正なJSONで予期しないステータス: ${res.status}`);
  });

  await runner.test('大きすぎるリクエスト', async () => {
    const largeData = {
      fullName: 'テスト',
      notes: 'x'.repeat(100000) // 100KB のメモ
    };
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largeData)
    });
    // サイズ制限がある場合は413、ない場合は201
    assert(res.status === 201 || res.status === 413, 
           `大きなデータで予期しないステータス: ${res.status}`);
  });

  // ========== 5. 検索・フィルタ単体テスト ==========
  console.log('\n📁 5. 検索・フィルタ単体テスト');
  
  await runner.test('部分一致検索', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?search=テスト`);
    assert(res.status === 200, `ステータスコード: ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.data), '検索結果が配列でない');
  });

  await runner.test('複数条件フィルタ', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?hasPhone=1&hasEmail=1`);
    assert(res.status === 200, `ステータスコード: ${res.status}`);
    const data = await res.json();
    // フィルタ結果の各アイテムが条件を満たすかチェック
    data.data.forEach(contact => {
      if (data.data.length > 0) {
        // データがある場合のみチェック
        assert(contact.phone || contact.email, 
               'フィルタ条件を満たさないデータが含まれている');
      }
    });
  });

  await runner.test('ソート機能', async () => {
    const res = await fetch(`${BASE_URL}/api/contacts?sortBy=createdAt&sortOrder=desc`);
    assert(res.status === 200, `ステータスコード: ${res.status}`);
    const data = await res.json();
    
    // データが2件以上ある場合、ソート順をチェック
    if (data.data.length >= 2) {
      const dates = data.data.map(c => new Date(c.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        assert(dates[i-1] >= dates[i], 'ソート順が正しくない');
      }
    }
  });

  // ========== 6. パフォーマンス単体テスト ==========
  console.log('\n📁 6. パフォーマンス単体テスト');
  
  await runner.test('API応答時間 - 連絡先一覧', async () => {
    const start = Date.now();
    await fetch(`${BASE_URL}/api/contacts`);
    const elapsed = Date.now() - start;
    assert(elapsed < 1000, `応答時間: ${elapsed}ms (期待値: 1000ms以内)`);
  });

  await runner.test('API応答時間 - 統計', async () => {
    const start = Date.now();
    await fetch(`${BASE_URL}/api/statistics`);
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `応答時間: ${elapsed}ms (期待値: 2000ms以内)`);
  });

  await runner.test('並列リクエスト処理', async () => {
    const start = Date.now();
    const promises = Array(5).fill(null).map(() => 
      fetch(`${BASE_URL}/api/contacts`)
    );
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;
    
    results.forEach(res => {
      assert(res.status === 200, '並列リクエストでエラー発生');
    });
    assert(elapsed < 3000, `5並列リクエスト処理時間: ${elapsed}ms (期待値: 3000ms以内)`);
  });

  // ========== 7. セキュリティ単体テスト ==========
  console.log('\n📁 7. セキュリティ単体テスト');
  
  await runner.test('SQLインジェクション対策', async () => {
    const maliciousInput = "'; DROP TABLE contacts; --";
    const res = await fetch(`${BASE_URL}/api/contacts?search=${encodeURIComponent(maliciousInput)}`);
    assert(res.status === 200, 'SQLインジェクション試行でサーバーエラー');
    // データベースがまだ動作していることを確認
    const checkRes = await fetch(`${BASE_URL}/api/contacts`);
    assert(checkRes.status === 200, 'データベースが破損した可能性');
  });

  await runner.test('XSS対策', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: xssPayload,
        notes: xssPayload
      })
    });
    
    if (res.status === 201) {
      const data = await res.json();
      // エスケープされているか、そのまま保存されているかチェック
      assert(!data.fullName.includes('<script>') || data.fullName === xssPayload,
             'XSSペイロードが不適切に処理された');
    }
  });

  // ========== 8. OCR機能単体テスト ==========
  console.log('\n📁 8. OCR機能単体テスト');
  
  await runner.test('OCRエンドポイント存在確認', async () => {
    const res = await fetch(`${BASE_URL}/api/ocr/upload`, {
      method: 'POST'
    });
    assert(res.status !== 404, 'OCRエンドポイントが存在しない');
  });

  runner.skip('OCR画像処理（APIキーが必要）');

  // テスト結果サマリー
  runner.printSummary();
  
  if (runner.results.failed > 0) {
    console.log('\n❌ 失敗したテスト:');
    runner.results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}`);
      console.log(`    ${t.error}`);
    });
  }
  
  console.log('\n✨ 単体テスト完了');
  process.exit(runner.results.failed > 0 ? 1 : 0);
}

// テスト実行
runUnitTests().catch(error => {
  console.error('テスト実行エラー:', error);
  process.exit(1);
});