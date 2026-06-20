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
```

ローカルでは `.env.local` に設定します。

## ローカル起動方法

```bash
npm install
npm run web
```

ポートを指定する場合:

```bash
npm run web -- --port 8083 --clear
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
