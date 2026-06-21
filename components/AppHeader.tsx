import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from './Themed';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow} lightColor="transparent" darkColor="transparent">
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText} lightColor="#ffffff" darkColor="#ffffff">
            AI
          </Text>
        </View>
        <View style={styles.brandCopy} lightColor="transparent" darkColor="transparent">
          <Link href="/" style={styles.logo}>
            AI Office
          </Link>
          <Text style={styles.tagline}>案件から入金まで管理するSaaS</Text>
        </View>
      </View>
      <View style={styles.nav} lightColor="transparent" darkColor="transparent">
        <Link href={'/projects' as never} style={styles.navLink}>
          案件
        </Link>
        <Link href={'/customers' as never} style={styles.navLink}>
          顧客
        </Link>
        <Link href="/estimate" style={styles.navLink}>
          見積
        </Link>
        <Link href="/invoice" style={styles.navLink}>
          請求
        </Link>
        <Link href={'/pricing' as never} style={styles.navLink}>
          料金
        </Link>
        <Link href="/settings" style={styles.navLink}>
          設定
        </Link>
        <Link href="/settings?tab=mypage" style={styles.loginLink}>
          ログイン
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: 960,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logoMark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  logoMarkText: {
    fontSize: 15,
    fontWeight: '900',
  },
  brandCopy: {
    gap: 1,
  },
  logo: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  tagline: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navLink: {
    overflow: 'hidden',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  loginLink: {
    overflow: 'hidden',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
});
