# AI Office Security Checklist

## 環境変数

- `.env.local` と `.env*.local` はGit管理しない。
- `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SERVICE_ROLE_KEY` はVercel Server Environment Variablesのみに設定する。
- `EXPO_PUBLIC_` に秘密鍵を入れない。許可するのは `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`、`EXPO_PUBLIC_SITE_URL` のみ。
- Stripeの本番キーを設定する前に、Git履歴とVercelログへ秘密鍵が出ていないか確認する。

## Supabase RLS

- `profiles`、`customers`、`projects`、`estimates`、`invoices`、`subscriptions`、`usage_limits` はRLSを有効化する。
- policyは `auth.uid() = user_id` または `auth.uid() = id` を必須条件にする。
- `SELECT` / `INSERT` / `UPDATE` / `DELETE` はログインユーザー本人の行だけ許可する。
- service role keyはAPIサーバー内だけで使い、フロントへ渡さない。

## Stripe

- Webhook endpointは `STRIPE_WEBHOOK_SECRET` で署名検証する。
- 署名がない、または不正なリクエストは `400` で拒否する。
- subscription更新時は `metadata.user_id` または既存の `stripe_customer_id` と照合してから `profiles` を更新する。
- Checkout作成APIはSupabase AuthのBearer tokenを必須にする。

## Auth / API

- 未ログイン時はクラウド保存API・Stripe APIを実行できない。
- `user_id` はフロント入力値を信用せず、必ずSupabase Authの `user.id` を使う。
- 他ユーザーIDを指定した保存・更新・削除はRLSで拒否されることを確認する。

## 入力値

- 金額、工数、単価は0以上の数値のみ保存する。
- 顧客名、案件名、メモ、請求番号などは文字数制限をかける。
- メールは形式チェックする。
- HTMLタグ、scriptタグ、`javascript:` / `data:` URL断片は保存前に除去する。
- React Native Webの通常描画を使い、ユーザー入力をHTMLとして挿入しない。

## デプロイ前確認

- `npm exec -- tsc --noEmit`
- `npx expo export -p web`
- `npm audit`
- `git grep` と `git log -G` で秘密鍵らしき文字列がないことを確認する。
- 本番URLでセキュリティヘッダーが返ることを確認する。
- Webhook署名なしリクエストが拒否されることを確認する。
