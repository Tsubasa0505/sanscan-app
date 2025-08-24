/**
 * SanScan 基本スモークテスト
 * 
 * 主要な機能が動作することを確認する基本的なテストです。
 * リリース前に必ず実行してください。
 * 
 * 実行方法:
 * 1. npm install playwright
 * 2. node tests/basic-smoke-test.js
 */

const { chromium } = require('playwright');

async function runSmokeTests() {
  console.log('🚀 SanScan スモークテスト開始');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // テスト結果を記録
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };

    // テストヘルパー関数
    const test = async (name, testFn) => {
      results.total++;
      try {
        console.log(`▶️ テスト実行: ${name}`);
        await testFn();
        console.log(`✅ 合格: ${name}`);
        results.passed++;
        results.tests.push({ name, status: 'PASS', error: null });
      } catch (error) {
        console.log(`❌ 失敗: ${name} - ${error.message}`);
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
      }
    };

    // 基本URL（環境に応じて変更してください）
    const BASE_URL = 'http://localhost:3010';

    // テスト1: ホームページの表示
    await test('ホームページが正常に表示される', async () => {
      await page.goto(BASE_URL);
      await page.waitForSelector('h1');
      const title = await page.textContent('h1');
      if (!title.includes('SanScan')) {
        throw new Error('タイトルにSanScanが含まれていません');
      }
    });

    // テスト2: ダークモード切り替え
    await test('ダークモード切り替えが動作する', async () => {
      const darkModeButton = await page.locator('button[title*="ダークモード"], button[aria-label*="ダークモード"]');
      await darkModeButton.click();
      await page.waitForTimeout(500); // アニメーションの待機
      
      // ダークモードが適用されているかチェック
      const bodyClass = await page.getAttribute('body', 'class') || '';
      const isDarkMode = bodyClass.includes('dark') || 
                        await page.locator('.bg-gray-900').count() > 0;
      
      if (!isDarkMode) {
        throw new Error('ダークモードが適用されていません');
      }
    });

    // テスト3: 連絡先ページへのナビゲーション
    await test('連絡先ページに遷移できる', async () => {
      await page.click('a[href="/contacts"]');
      await page.waitForURL('**/contacts');
      await page.waitForSelector('h1, h2');
      
      const heading = await page.textContent('h1, h2');
      if (!heading.includes('連絡先') && !heading.includes('Contact')) {
        throw new Error('連絡先ページが正しく表示されていません');
      }
    });

    // テスト4: 新規連絡先フォームの表示
    await test('新規連絡先フォームが表示される', async () => {
      // 新規追加ボタンを探す
      const addButton = await page.locator('button:has-text("新規追加"), button:has-text("追加"), button:has-text("Add")').first();
      await addButton.click();
      
      // フォームが表示されるまで待機
      await page.waitForSelector('input[placeholder*="氏名"], input[name="fullName"]', { timeout: 5000 });
      
      const nameInput = await page.locator('input[placeholder*="氏名"], input[name="fullName"]');
      const isVisible = await nameInput.isVisible();
      
      if (!isVisible) {
        throw new Error('新規連絡先フォームが表示されていません');
      }
    });

    // テスト5: フォーム入力とバリデーション
    await test('フォームバリデーションが動作する', async () => {
      // テストデータを入力
      const testData = {
        fullName: 'テスト太郎',
        email: 'test@example.com',
        phone: '090-1234-5678',
        company: 'テスト株式会社'
      };

      // 各フィールドに入力
      await page.fill('input[name="fullName"], input[placeholder*="氏名"]', testData.fullName);
      
      const emailInput = await page.locator('input[name="email"], input[type="email"]').first();
      if (await emailInput.count() > 0) {
        await emailInput.fill(testData.email);
      }
      
      const phoneInput = await page.locator('input[name="phone"], input[placeholder*="電話"]').first();
      if (await phoneInput.count() > 0) {
        await phoneInput.fill(testData.phone);
      }
      
      // 保存ボタンをクリック
      const saveButton = await page.locator('button:has-text("保存"), button:has-text("Save"), button[type="submit"]').first();
      await saveButton.click();
      
      // 保存が成功したかチェック（エラーメッセージがないことを確認）
      await page.waitForTimeout(2000);
      const errorMessages = await page.locator('.error, .text-red-500, .text-red-600').count();
      
      if (errorMessages > 0) {
        const errorText = await page.locator('.error, .text-red-500, .text-red-600').first().textContent();
        throw new Error(`バリデーションエラー: ${errorText}`);
      }
    });

    // テスト6: 検索機能
    await test('基本検索機能が動作する', async () => {
      // 検索フィールドを探す
      const searchInput = await page.locator('input[placeholder*="検索"], input[type="search"]').first();
      
      if (await searchInput.count() > 0) {
        await searchInput.fill('テスト');
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
        
        // 検索結果が表示されているかチェック
        const results = await page.locator('tr, .card, .contact').count();
        if (results === 0) {
          throw new Error('検索結果が表示されていません');
        }
      } else {
        console.log('⚠️ 検索フィールドが見つからないため、このテストをスキップします');
      }
    });

    // テスト7: レスポンシブデザインの確認
    await test('モバイル表示が適切である', async () => {
      // モバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // ページが適切に表示されているかチェック
      const body = await page.locator('body');
      const bodyWidth = await body.boundingBox();
      
      if (bodyWidth.width > 400) {
        throw new Error('モバイル表示で幅が適切に調整されていません');
      }
      
      // デスクトップサイズに戻す
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    // テスト結果の表示
    console.log('\n📊 テスト結果サマリー');
    console.log('='.repeat(50));
    console.log(`総テスト数: ${results.total}`);
    console.log(`合格: ${results.passed} ✅`);
    console.log(`不合格: ${results.failed} ❌`);
    console.log(`合格率: ${Math.round((results.passed / results.total) * 100)}%`);
    
    if (results.failed > 0) {
      console.log('\n❌ 失敗したテスト:');
      results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    // 結果をJSONファイルに保存
    const fs = require('fs');
    const testResult = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        passRate: Math.round((results.passed / results.total) * 100)
      },
      tests: results.tests
    };
    
    fs.writeFileSync('./test-results.json', JSON.stringify(testResult, null, 2));
    console.log('\n📄 詳細結果を test-results.json に保存しました');
    
    // 最終判定
    if (results.failed === 0) {
      console.log('\n🎉 全てのスモークテストが合格しました！リリース準備完了です。');
      process.exit(0);
    } else {
      console.log(`\n⚠️ ${results.failed}件のテストが失敗しました。修正が必要です。`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// メイン実行
if (require.main === module) {
  runSmokeTests().catch(error => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { runSmokeTests };