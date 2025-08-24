# SanScan テストスイート

SanScanアプリケーションの品質保証とテスト実行のためのテストスイートです。

## 📁 ファイル構成

```
tests/
├── basic-smoke-test.js     # 基本スモークテストスクリプト
├── package.json           # テスト用の依存関係とスクリプト
├── README.md              # このファイル
└── test-results.json      # テスト実行結果（自動生成）
```

## 🚀 テスト実行方法

### 1. 初回セットアップ

```bash
cd tests
npm install
npm run test:install
```

### 2. スモークテスト実行

```bash
# 基本スモークテストを実行
npm test

# または
npm run test:smoke
```

### 3. テスト結果確認

```bash
# 結果をコンソールに表示
npm run test:report

# JSONファイルを直接確認
cat test-results.json
```

## 📋 テストの種類

### スモークテスト（basic-smoke-test.js）

リリース前に必ず実行する基本的な機能テストです。

**テスト項目:**
- ✅ ホームページの表示
- ✅ ダークモード切り替え
- ✅ 連絡先ページへの遷移
- ✅ 新規連絡先フォーム表示
- ✅ フォームバリデーション
- ✅ 基本検索機能
- ✅ レスポンシブデザイン（モバイル表示）

**実行時間:** 約2-3分

### 手動テスト

詳細な機能テストは手動で実行してください：

- `../TEST_SPECIFICATIONS.md` - 包括的なテスト仕様書
- `../TEST_CHECKLIST.md` - 実行用チェックリスト

## 🔧 テスト設定

### 環境設定

テスト実行前に以下を確認してください：

1. **アプリケーションが起動している**
   ```bash
   # メインディレクトリで
   npm run dev
   ```

2. **ポート番号の確認**
   - デフォルト: `http://localhost:3010`
   - 異なる場合は `basic-smoke-test.js` の `BASE_URL` を変更

3. **ブラウザの準備**
   - Playwright が Chrome をダウンロード・インストール
   - インターネット接続が必要（初回のみ）

### ブラウザ設定

デフォルトでは Chrome を使用しますが、他のブラウザでもテスト可能です：

```javascript
// Firefox の場合
const { firefox } = require('playwright');
const browser = await firefox.launch();

// Safari の場合
const { webkit } = require('playwright');  
const browser = await webkit.launch();
```

## 📊 テスト結果の見方

### 成功例
```bash
🚀 SanScan スモークテスト開始
▶️ テスト実行: ホームページが正常に表示される
✅ 合格: ホームページが正常に表示される
...

📊 テスト結果サマリー
==================================================
総テスト数: 7
合格: 7 ✅
不合格: 0 ❌
合格率: 100%

🎉 全てのスモークテストが合格しました！リリース準備完了です。
```

### 失敗例
```bash
❌ 失敗: ダークモード切り替えが動作する - ダークモードが適用されていません

📊 テスト結果サマリー
==================================================
総テスト数: 7
合格: 6 ✅
不合格: 1 ❌
合格率: 86%

❌ 失敗したテスト:
  - ダークモード切り替えが動作する: ダークモードが適用されていません

⚠️ 1件のテストが失敗しました。修正が必要です。
```

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. アプリケーションに接続できない
```
Error: net::ERR_CONNECTION_REFUSED
```
**解決方法:**
- アプリケーションが起動しているか確認
- ポート番号が正しいか確認（3010）
- ファイアウォール設定を確認

#### 2. 要素が見つからない
```
Error: 元素が見つかりません
```
**解決方法:**
- アプリケーションのUIが変更されている可能性
- 待機時間を増やす（`page.waitForTimeout()`）
- セレクタを更新する

#### 3. テスト実行が遅い
**解決方法:**
- `headless: true` でヘッドレスモードを使用
- 不要な `waitForTimeout()` を削除
- 並列実行を検討

#### 4. Playwright のインストールエラー
**解決方法:**
```bash
# 手動でブラウザをインストール
npx playwright install chromium

# または全ブラウザをインストール  
npx playwright install
```

## 📈 テストの拡張

### 新しいテストケースの追加

1. `basic-smoke-test.js` に新しい `test()` を追加：

```javascript
await test('新機能のテスト', async () => {
  // テストロジックを記述
  await page.click('.new-feature-button');
  await page.waitForSelector('.new-feature-result');
  
  const result = await page.textContent('.new-feature-result');
  if (!result.includes('期待する文字列')) {
    throw new Error('新機能が正常に動作していません');
  }
});
```

### 高度なテストの作成

複雑な機能テスト用に新しいファイルを作成：

```javascript
// advanced-test.js
const { test, expect } = require('@playwright/test');

test('高度なユーザーシナリオ', async ({ page }) => {
  // 複雑なテストシナリオ
});
```

## 🎯 ベストプラクティス

### テスト作成時の推奨事項

1. **明確なテスト名**: 何をテストしているか分かりやすく
2. **適切な待機**: `waitForSelector()` で要素の表示を待つ
3. **エラーメッセージ**: 失敗時に原因が分かりやすいメッセージ
4. **環境に依存しない**: ハードコードを避ける
5. **実行速度**: 不要な待機時間を避ける

### テスト実行時の推奨事項

1. **定期実行**: CI/CD パイプラインに組み込む
2. **環境の統一**: 同じ環境でテスト実行
3. **結果の記録**: テスト結果を保存・管理
4. **問題の迅速な対応**: 失敗時は速やかに調査・修正

## 📞 サポート

テストに関する質問や問題がある場合：

1. まず本README と既存のイシューを確認
2. 再現可能な最小限の例を作成
3. 環境情報（OS、ブラウザ、Node.js バージョン）を含める
4. 開発チームに連絡

---

*📅 最終更新: 2025年1月20日*
*✏️ 作成者: SanScan Development Team*
*📋 バージョン: 1.0*