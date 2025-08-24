# 文字コード設定ガイド

このプロジェクトでは文字化けを防ぐため、以下の設定を行っています。

## 🎯 統一文字コード
**UTF-8（BOMなし）** で統一

## 📝 設定ファイル

### 1. `.editorconfig`
すべてのエディタで共通の文字コード設定を適用
- charset = utf-8
- 改行コード = LF
- 末尾の空白削除 = 有効

### 2. `.vscode/settings.json`
VS Code専用の設定
- files.encoding = utf8
- 自動文字コード検出 = 無効
- 保存時の自動フォーマット = 有効

### 3. `next.config.mjs`
Next.jsの設定
- APIレスポンスヘッダー: `Content-Type: application/json; charset=utf-8`
- i18n設定: defaultLocale = 'ja'
- Webpack: UTF-8エンコーディングを保証

### 4. `app/layout.tsx`
HTMLメタタグ
- `<meta charSet="utf-8" />`
- `<html lang="ja">`

## 🔧 トラブルシューティング

### 文字化けが発生した場合

1. **ファイル保存時**
   - エディタの文字コード設定を確認
   - UTF-8（BOMなし）で再保存

2. **CSV/Excelファイル**
   ```javascript
   // CSVエクスポート時
   const csv = '\uFEFF' + csvContent; // BOM付きUTF-8
   ```

3. **APIレスポンス**
   ```typescript
   // レスポンスヘッダーを明示
   return new Response(JSON.stringify(data), {
     headers: {
       'Content-Type': 'application/json; charset=utf-8'
     }
   });
   ```

4. **データベース**
   ```sql
   -- SQLiteは自動的にUTF-8
   -- MySQLの場合
   ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

## 🚀 新規ファイル作成時

1. VS Codeを使用している場合
   - 自動的にUTF-8で作成される

2. 他のエディタを使用する場合
   - 文字コードをUTF-8に設定してから作成

3. コマンドラインから作成
   ```bash
   # PowerShell (Windows)
   [System.IO.File]::WriteAllText("filename.txt", "content", [System.Text.Encoding]::UTF8)
   
   # Bash (Mac/Linux)
   echo "content" > filename.txt  # デフォルトでUTF-8
   ```

## ✅ チェックリスト

- [ ] エディタの文字コード設定がUTF-8
- [ ] .editorconfigがプロジェクトルートに存在
- [ ] VS Codeの設定が適用されている
- [ ] git configで改行コード設定が適切
  ```bash
  git config core.autocrlf false  # Windows
  git config core.autocrlf input  # Mac/Linux
  ```

## 📚 参考リンク

- [EditorConfig](https://editorconfig.org/)
- [VS Code Encoding](https://code.visualstudio.com/docs/editor/codebasics#_file-encoding-support)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [MDN: Character Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Character_encoding)