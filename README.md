# 💰 マイ家計簿

クレジットカード明細を分析する家計簿アプリ

## 🚀 Netlify デプロイ手順（3ステップ）

### ステップ1: GitHubにアップ
1. GitHub で新しいリポジトリを作成（Private推奨）
2. このフォルダの中身を全部アップロード

### ステップ2: Netlifyに接続
1. [app.netlify.com](https://app.netlify.com) にログイン
2. 「Add new site」→「Import an existing project」
3. 「GitHub」を選択 → `kakeibo-app` リポジトリを選択
4. Build settings は自動検出されます。されない場合：
   - Build command: `npm run build`
   - Publish directory: `.next`
5. 「Deploy site」をクリック
6. 1〜2分で完了！URLが発行されます

### ステップ3: スマホでホーム画面に追加
- **iPhone**: Safari → 共有（□↑）→ ホーム画面に追加
- **Android**: Chrome → ⋮ → ホーム画面に追加

## 🤖 AI分析機能を有効にする（任意）
1. Netlify管理画面 → Site configuration → Environment variables
2. 「Add a variable」をクリック
3. Key: `ANTHROPIC_API_KEY` / Value: あなたのAPIキー
4. 保存後、Deploys → Trigger deploy → Deploy site

※ 設定しなくてもルールベースのアドバイスは常に動きます

## 機能一覧
- 💳 CSV明細アップロード＆自動カテゴリ分類
- 💼 収入管理（給与・副業・賞与・投資収益）
- 💸 カード外の支出を手入力
- 📊 固定費vs変動費、カテゴリ別分析、年間累計グラフ
- 💎 資産管理（預金・株・投信・暗号資産）推移グラフ
- 🎯 貯金目標＆進捗バー
- 🤖 ルールベース＋AI家計アドバイス
- 📲 PWA対応（ホーム画面追加で独立起動）
