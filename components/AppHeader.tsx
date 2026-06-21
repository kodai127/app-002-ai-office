import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { View } from './Themed';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Link href="/" style={styles.logo}>
        AI Office
      </Link>
      <View style={styles.nav} lightColor="transparent" darkColor="transparent">
        <Link href="/estimate" style={styles.navLink}>
          見積書
        </Link>
        <Link href="/invoice" style={styles.navLink}>
          請求書
        </Link>
        <Link href="/settings?tab=customers" style={styles.navLink}>
          顧客管理
        </Link>
        <Link href="/settings?tab=billing" style={styles.navLink}>
          料金
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
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  logo: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navLink: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    color: '#334155',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  loginLink: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
});
