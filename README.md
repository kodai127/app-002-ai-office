# AI Office

AI Office is a mobile-first business SaaS app for creating estimates and invoices, managing customers, and saving business records to Supabase.

## アプリ概要

AI Office は、フリーランスや小規模事業者向けの見積書・請求書作成アプリです。顧客情報、見積履歴、請求書履歴を一元管理し、PDF出力とSupabase保存に対応しています。

## 解決する課題

- 見積書や請求書をスプレッドシートで個別管理している
- 顧客ごとの過去見積や請求履歴を探しにくい
- スマホで素早く見積金額を確認したい
- PDF出力やDB保存まで含めた軽量な業務ツールがほしい

## ターゲットユーザー

- フリーランス
- 個人事業主
- 小規模制作会社
- 副業ワーカー
- 見積・請求業務を簡単に管理したい小規模チーム

## 主な機能

- 顧客管理
- 見積作成
- 見積履歴保存
- 請求書作成
- 請求書履歴保存
- 見積から請求書への変換
- PDF出力
- ダッシュボード
- Supabase永続化

## 技術スタック

- Expo SDK 56
- React Native
- React Native Web
- Expo Router
- TypeScript
- Supabase
- expo-print
- expo-sharing
- expo-file-system

## Supabase構成

利用テーブル:

- `customers`
- `estimates`
- `invoices`

SQL定義は [supabase/schema.sql](./supabase/schema.sql) にあります。

必要な環境変数:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SITE_URL=https://app-002-ai-office.vercel.app
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
SUPABASE_SERVICE_ROLE_KEY=
```

ローカルでは `.env.local` に設定します。

### SaaS化に必要なSupabase設定

1. Supabase Dashboardで Email Auth を有効化します。
2. Authentication > URL Configuration に公開URLを設定します。

```text
Site URL: https://app-002-ai-office.vercel.app
Redirect URLs:
https://app-002-ai-office.vercel.app
https://app-002-ai-office.vercel.app/settings
```

認証メールのリンクはアプリ側で `https://app-002-ai-office.vercel.app/settings` を `emailRedirectTo` に指定します。Supabase Dashboard 側の `Site URL` と `Redirect URLs` は、本番URLへ必ず変更してください。

3. SQL Editorで [supabase/schema.sql](./supabase/schema.sql) を実行します。

このSQLは `profiles`、`customers`、`estimates`、`invoices` を作成し、`auth.uid()` ベースのRLSでユーザー別にデータを分離します。

### Stripe Checkout / Webhook設定

Stripe Dashboardで月額商品とPriceを作成し、Vercel環境変数に設定します。

```text
Pro: 月額980円
Business: 月額2980円
```

Vercel環境変数:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
SUPABASE_SERVICE_ROLE_KEY=
```

Webhook endpoint:

```text
https://app-002-ai-office.vercel.app/api/stripe-webhook
```

購読イベントを受信すると、`profiles.plan` と `profiles.subscription_status` が自動更新されます。

## ローカル起動方法

```bash
npm install
npm run web
```

ポートを指定する場合:

```bash
npm run web -- --port 8083 --clear
```

## Web公開方法（Vercel）

このプロジェクトは Expo Router の静的Web出力を使って、Vercel へ公開できます。

想定公開URL:

```text
https://app-002-ai-office.vercel.app
```

別のVercelプロジェクト名や独自ドメインを使う場合は、公開前に以下を実際のURLへ変更してください。

- `EXPO_PUBLIC_SITE_URL`
- `public/robots.txt` の Sitemap URL
- `public/sitemap.xml` の各 `loc`

### Vercelの設定

Vercel Dashboard でこのリポジトリをImportし、以下の設定でDeployします。

```text
Framework Preset: Other
Build Command: npx expo export -p web
Output Directory: dist
Install Command: npm install
```

環境変数:

```env
EXPO_PUBLIC_SITE_URL=https://app-002-ai-office.vercel.app
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_BUSINESS_PRICE_ID=
SUPABASE_SERVICE_ROLE_KEY=
```

Supabaseを使わずにまず画面確認だけ行う場合、`EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_ANON_KEY` は未設定でも起動できます。その場合はサンプルデータとブラウザ内ローカル保存で動作します。

### CLIで確認する場合

```bash
npx expo export -p web
npx expo serve
```

Vercel CLIでデプロイする場合:

```bash
npm install --global vercel@latest
vercel
```

本番URLへ反映する場合:

```bash
vercel --prod
```

## 今後のロードマップ

- 認証機能
- Stripe課金
- 顧客別の見積・請求履歴詳細
- 入金ステータス管理
- PDFテンプレート改善
- ダッシュボードの集計強化
- チーム利用
- 本番向けRLSポリシー設計

## スクリーンショット掲載エリア

### ダッシュボード

<!-- screenshot: dashboard -->

### 見積作成

<!-- screenshot: estimate -->

### 請求書作成

<!-- screenshot: invoice -->

### 顧客管理

<!-- screenshot: customers -->
