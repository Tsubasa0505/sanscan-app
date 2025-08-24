# OCR機能のセットアップ方法

## 環境変数の設定

`.env`ファイルに以下の環境変数を設定してください：

```
GOOGLE_CLOUD_VISION_API_KEY="あなたのAPIキーをここに設定"
```

**重要なセキュリティ注意事項:**
- APIキーは絶対に公開リポジトリにコミットしないでください
- APIキーは`.env`ファイルにのみ保存してください
- `.env`ファイルは`.gitignore`に含まれていることを確認してください
- APIキーが漏洩した場合は、即座にGoogle Cloud Consoleで無効化し、新しいキーを生成してください

## Google Cloud Vision APIの有効化

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（または新規作成）

3. 「APIとサービス」→「有効なAPI」を選択
4. 「Cloud Vision API」を検索して有効化
5. 「認証情報」→「認証情報を作成」→「APIキー」を選択
6. 作成されたAPIキーをコピーして`.env`ファイルに設定

## APIキーの制限設定（推奨）

セキュリティ向上のため、APIキーに制限を設定することを推奨します：

1. Google Cloud Console → 「APIとサービス」→「認証情報」
2. 作成したAPIキーをクリック
3. 「アプリケーションの制限」で適切な制限を設定：
   - HTTPリファラー（ウェブサイト）
   - IPアドレス（サーバー、クラウドなど）
4. 「APIの制限」で「Cloud Vision API」のみを選択

## 動作確認

1. 開発サーバーを起動: `npm run dev`
2. ブラウザで http://localhost:3010/contacts にアクセス
3. 「名刺をスキャン」ボタンから画像をアップロード
4. OCR結果が自動的に連絡先として登録されることを確認

## トラブルシューティング

- **エラー: "Google Cloud Vision APIキーが設定されていません"**
  → `.env`ファイルに`GOOGLE_CLOUD_VISION_API_KEY`が設定されているか確認

- **エラー: "API key not valid"**
  → APIキーが正しいか、Cloud Vision APIが有効化されているか確認

- **エラー: "Quota exceeded"**
  → 無料枠を超過している可能性があります。Google Cloud Consoleで使用量を確認してください