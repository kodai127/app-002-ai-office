import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { User } from '@supabase/supabase-js';

import { getCurrentUser, sendLoginLink, signOut, subscribeToAuthState } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { Text, View } from './Themed';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser().then((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
      }
    });

    const unsubscribe = subscribeToAuthState(setUser);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setStatus('ログインリンクを送信しています...');

    try {
      await sendLoginLink(email.trim());
      setStatus('ログインリンクを送信しました。メールを確認してください。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインリンクの送信に失敗しました。';
      setStatus(message);
    }
  };

  const handleSignOut = async () => {
    setStatus('ログアウトしています...');

    try {
      await signOut();
      setStatus('ログアウトしました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログアウトに失敗しました。';
      setStatus(message);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>ログイン</Text>
      <Text style={styles.description}>
        顧客管理、請求書履歴、クラウド保存を使うにはメールリンクでログインしてください。
      </Text>
      {!isSupabaseConfigured ? (
        <Text style={styles.status}>Supabase環境変数が未設定です。Free体験のみ利用できます。</Text>
      ) : user ? (
        <>
          <Text style={styles.status}>ログイン中: {user.email ?? user.id}</Text>
          <Pressable style={styles.secondaryButton} onPress={handleSignOut}>
            <Text style={styles.secondaryButtonText}>ログアウト</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
              ログインリンクを送信
            </Text>
          </Pressable>
        </>
      )}
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d8dee8',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d8dee8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  status: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
});
