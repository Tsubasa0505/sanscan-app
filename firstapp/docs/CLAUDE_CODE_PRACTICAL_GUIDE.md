# Claude Code 実践ガイド - 今回の開発経験から学ぶ

## 📝 実際のケーススタディ
プロジェクト: 名刺管理アプリ（Sansan風）
期間: 2024年8月
主な作業: Git設定、ビルド修正、デザインシステム実装

---

## 1. プロジェクト開始時の落とし穴と対策

### 🔴 実際に起きた問題

#### 問題1: Nested Git Repository
```bash
# 失敗例
C:\myapps\.git          # 親ディレクトリのgit
C:\myapps\firstapp\.git # 子ディレクトリのgit（問題の原因）
```

#### 解決方法
```bash
# 1. 問題の特定
git status  # "modified: firstapp (new commits)"のような表示

# 2. 解決
rm -rf firstapp/.git
git rm --cached firstapp
git add firstapp/
git commit -m "Fix: Remove nested git repository"
```

### ✅ 正しい開始手順

```markdown
## プロジェクト開始チェックリスト

1. **ディレクトリ構造の確認**
   □ 親ディレクトリに.gitがないか確認
   □ クラウド同期フォルダでないか確認（OneDrive/Dropbox回避）
   
2. **初期ファイルの準備**
   □ CLAUDE.md作成（プロジェクト固有情報）
   □ .gitignore確認（node_modules、.env含む）
   □ README.md作成

3. **Git初期化**
   □ git init実行
   □ GitHub repository作成
   □ 初回コミット&プッシュ
```

---

## 2. ビルドエラー対処の実践例

### 🔴 実際に起きたエラー

#### エラー1: Syntax Error (2200行のファイル)
```typescript
// 問題: return文の位置エラー
Syntax error: Unexpected token (571:6)
```

#### 解決プロセス
```markdown
## 3回ルールの実践例

### 試行1: エラー箇所の修正（失敗）
「571行目のreturn文を修正してください」
→ ファイルが大きすぎて特定困難

### 試行2: ファイル全体の確認（失敗）
「contacts/page.tsxの構造を確認してください」
→ 2200行は複雑すぎる

### 試行3: 別アプローチ（成功）
「contacts/page.tsxを簡潔な実装に置き換えてください」
→ 321行のシンプルな実装に成功
```

#### エラー2: Missing Exports
```typescript
Module not found: Can't resolve '@/shared/constants'
```

#### 解決方法
```bash
# 1. エラーの特定
「ビルドエラーの詳細を確認してください」

# 2. 不足ファイルの作成
「shared/constants.tsを作成して必要なexportを定義してください」

# 3. 確認
npm run build
```

### ✅ エラー対処のベストプラクティス

```markdown
## エラー解決フローチャート

1. **エラーメッセージの完全な取得**
   - スクリーンショットより、テキストコピーが望ましい
   - スタックトレース全体を含める

2. **段階的な対処**
   ```
   小さい問題 → 直接修正
   中規模問題 → 部分的な書き換え
   大規模問題 → 全体の再設計
   ```

3. **実例: 今回のアプローチ**
   - ❌ 2200行のデバッグ（複雑すぎる）
   - ✅ 321行への書き換え（シンプル化）
```

---

## 3. デザイン変更の実践例

### 🔴 実際の失敗: 一括大規模変更

```markdown
## やってしまったこと
- 9ファイルを一度に変更
- 593行追加、2179行削除を1コミット
- テストなしで実装
- デザイントークンを全面変更
```

### ✅ 理想的なアプローチ

```markdown
## デザイン変更の段階的実装

### Stage 1: 準備（30分）
□ 現状のスクリーンショット取得
□ デザイン要件の明確化
□ 影響範囲の調査

### Stage 2: 基盤作成（30分）
□ CSS変数定義（globals.css）
□ 1コミット: "style: Add design tokens"

### Stage 3: コンポーネント個別対応（各20分）
□ ContactList更新
□ コミット: "style: Update ContactList design"
□ 動作確認
□ PageHeader更新
□ コミット: "style: Update PageHeader design"
（繰り返し）

### Stage 4: 統合テスト（30分）
□ 全体の動作確認
□ アクセシビリティチェック
□ ドキュメント作成
```

---

## 4. 効果的な要求の伝え方

### 実例から学ぶ

#### 🔴 曖昧な要求
```
「Calaudeのデザインはクラウドっぽくスタイリッシュではない」
```
→ 解釈の余地が大きすぎる

#### ✅ 明確な要求
```
「シニアFE/UXエンジニアとして、/contacts画面のデザインだけを改善してください。
制約：
- DOM構造変更禁止
- テキスト・ラベル変更禁止
- APIやイベント変更禁止
許可：
- CSS/Tailwindクラスのみ
- カラーパレット変更
- アニメーション追加」
```

### 要求テンプレート

```markdown
## 機能追加/変更依頼テンプレート

### 背景
[なぜこの変更が必要か]

### 要件
- 必須: [絶対に必要な要素]
- 推奨: [あると良い要素]
- 任意: [お任せする要素]

### 制約
- 変更禁止: [触ってはいけない部分]
- 維持必須: [保持すべき機能]

### 成功基準
- [ ] [測定可能な基準1]
- [ ] [測定可能な基準2]

### 参考
- [参考URL、画像、コード]
```

---

## 5. Git/GitHub連携の実践

### 今回の成功例

```bash
# 1. リポジトリ作成と連携
git remote add origin https://github.com/Tsubasa0505/sanscan-app
git push -u origin main

# 2. 適切なコミットメッセージ
git commit -m "feat: Implement Claude-inspired modern design system

- Added sophisticated purple & indigo gradient color scheme
- Implemented glass morphism effects
- Enhanced UI with smooth animations
- Updated all components with design tokens

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### コミット戦略

```markdown
## コミットサイズの目安

### 小（推奨）1-50行
- 単一ファイルの小修正
- バグフィックス
- スタイル調整

### 中（許容）50-200行
- 単一機能の実装
- 複数ファイルの関連修正

### 大（避ける）200行以上
→ 分割を検討

## 今回の反省
- ❌ 593行追加、2179行削除（大きすぎる）
- ✅ 理想: 50-100行単位で10コミット
```

---

## 6. テスト戦略（今回不足していた点）

### 🔴 今回の問題点

```markdown
## テストを書かなかった結果
- デザイン変更の影響範囲が不明確
- リグレッションの可能性
- 品質保証なし
```

### ✅ あるべきテスト戦略

```typescript
// 1. コンポーネントテスト例
describe('ContactList', () => {
  beforeEach(() => {
    // テストデータ準備
  });

  it('should render contact items', () => {
    // レンダリング確認
  });

  it('should handle dark mode toggle', () => {
    // ダークモード切り替え
  });

  it('should be keyboard accessible', () => {
    // Tab操作確認
  });
});

// 2. 統合テスト例
describe('Contacts Page', () => {
  it('should load and display contacts', async () => {
    // API呼び出しとレンダリング
  });

  it('should filter contacts on search', () => {
    // 検索機能
  });
});
```

### テスト実行タイミング

```markdown
## いつテストを書くか

1. **機能追加前**（TDD）
   □ テストを先に書く
   □ レッド→グリーン→リファクタリング

2. **バグ修正時**
   □ まず再現テストを書く
   □ 修正してグリーンに

3. **リファクタリング前**
   □ 現状のテストを確保
   □ 変更後も通ることを確認
```

---

## 7. 長時間セッションの管理

### 今回の経験から

```markdown
## セッション管理のコツ

### 開始時
1. 「CLAUDE.mdを読み込んでください」
2. 「前回の作業状況を確認してください」

### 作業中（1時間ごと）
1. 「現在の進捗をまとめてください」
2. 「TODOリストを更新してください」

### 終了時
1. 「今日の作業をSESSION_LOG.mdに記録してください」
2. 「次回の作業事項をTODO.mdに保存してください」
```

---

## 8. よくあるトラブルと対処法

### 実際に遭遇した問題集

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| Nested git repository | firstapp内に.git | .gitを削除して再add |
| Syntax error 2200行 | ファイルが複雑すぎ | シンプルな実装に置換 |
| Module not found | exportの不足 | constants.ts作成 |
| EPERM エラー | Windowsの権限問題 | 開発サーバー再起動 |
| 大規模変更の管理困難 | 一度に変更しすぎ | 段階的実装に変更 |

---

## 9. プロジェクト完了チェックリスト

### 今回できたこと ✅
- Git/GitHub設定
- ビルド成功
- デザイン実装
- ドキュメント作成

### 今回不足していたこと ❌
- テスト作成
- 段階的コミット
- パフォーマンス測定
- セキュリティチェック

### 理想的な完了基準

```markdown
## プロジェクト完了チェックリスト

### 必須
□ 全機能が動作する
□ ビルドが成功する
□ README.mdが完備
□ .envのサンプルがある
□ エラーハンドリング実装

### 推奨
□ テストカバレッジ70%以上
□ Lighthouse スコア90以上
□ セキュリティ脆弱性なし
□ ドキュメント完備
□ CI/CD設定

### 任意
□ Storybook設定
□ E2Eテスト
□ パフォーマンス最適化
□ 国際化対応
```

---

## まとめ: 今回の開発から得た教訓

### 🎯 最重要ポイント

1. **小さく始める**
   - ❌ 2200行を一度にデバッグ
   - ✅ 問題を分割して対処

2. **段階的に進める**
   - ❌ 9ファイル一括変更
   - ✅ 1ファイルずつ確認しながら

3. **テストを書く**
   - ❌ 後回しにした結果、品質不明
   - ✅ 最初から書けば安心

4. **記録を残す**
   - ✅ ドキュメント作成は良かった
   - ✅ コミットメッセージも明確に

5. **3回ルールを守る**
   - ✅ ビルドエラーで実践できた
   - 時間の無駄を防げた

### 次回への改善提案

```markdown
## 次のプロジェクトでは

1. 開始前に必ずIMPLEMENTATION_PLAN.md作成
2. 1機能 = 1ブランチ = 複数小コミット
3. テストファーストを徹底
4. 30分ごとに進捗確認
5. エラーは3回で諦めて別アプローチ
```

この実践ガイドは、実際の成功と失敗から学んだ内容です。
理論だけでなく、実体験に基づいているため、より実用的です。