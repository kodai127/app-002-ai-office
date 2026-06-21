import Head from 'expo-router/head';

export const defaultSiteUrl = 'https://app-002-ai-office.vercel.app';

const configuredSiteUrl = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '');
const siteUrl = configuredSiteUrl || defaultSiteUrl;
const siteName = 'AI Office';
const xAccountHandle = '@dai_k65852';
const xAccountUrl = 'https://x.com/dai_k65852';
const defaultDescription =
  'AI Officeは、フリーランスや小規模事業者向けの見積書・請求書作成Webアプリです。顧客管理、履歴保存、PDF出力をブラウザから利用できます。';

type SeoHeadProps = {
  description?: string;
  path?: string;
  title: string;
};

export function SeoHead({ description = defaultDescription, path = '/', title }: SeoHeadProps) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${siteUrl}${normalizedPath === '/' ? '' : normalizedPath}`;
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${siteUrl}/favicon.ico`} />
      <meta property="og:see_also" content={xAccountUrl} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content={xAccountHandle} />
      <meta name="twitter:creator" content={xAccountHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}/favicon.ico`} />
    </Head>
  );
}
