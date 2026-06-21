import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { User } from '@supabase/supabase-js';

import {
  consumeAuthCallbackMessage,
  getCurrentUser,
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signOut,
  signUpWithEmailPassword,
  subscribeToAuthState,
} from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { Text, View } from './Themed';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'info' | 'success'>('info');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    const callbackMessage = consumeAuthCallbackMessage();

    if (callbackMessage) {
      setStatus(callbackMessage.message);
      setStatusType(callbackMessage.type);
    }

    getCurrentUser().then((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        if (currentUser && !callbackMessage) {
          setStatus('ログイン状態を保持しています。');
          setStatusType('success');
        }
      }
    });

    const unsubscribe = subscribeToAuthState((currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        setStatus('ログインしました。ログイン状態はブラウザに保持されます。');
        setStatusType('success');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const validateCredentials = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus('メールアドレスを入力してください。');
      setStatusType('error');
      return null;
    }

    if (!password) {
      setStatus('パスワードを入力してください。');
      setStatusType('error');
      return null;
    }

    return { email: trimmedEmail, password };
  };

  const handleSignUp = async () => {
    const credentials = validateCredentials();

    if (!credentials) {
      return;
    }

    setStatus('新規登録しています...');
    setStatusType('info');

    try {
      await signUpWithEmailPassword(credentials.email, credentials.password);
      setStatus('新規登録しました。確認メールが届いた場合はメール内のリンクを開いてください。');
      setStatusType('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '新規登録に失敗しました。';
      setStatus(`新規登録できませんでした。${message}`);
      setStatusType('error');
    }
  };

  const handleLogin = async () => {
    const credentials = validateCredentials();

    if (!credentials) {
      return;
    }

    setStatus('ログインしています...');
    setStatusType('info');

    try {
      await signInWithEmailPassword(credentials.email, credentials.password);
      setStatus('ログインしました。ログイン状態はブラウザに保持されます。');
      setStatusType('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました。';
      setStatus(`ログインできませんでした。${message}`);
      setStatusType('error');
    }
  };

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus('パスワードリセット用のメールアドレスを入力してください。');
      setStatusType('error');
      return;
    }

    setStatus('パスワードリセットメールを送信しています...');
    setStatusType('info');

    try {
      await sendPasswordResetEmail(trimmedEmail);
      setStatus('パスワードリセットメールを送信しました。メールを確認してください。');
      setStatusType('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'パスワードリセットに失敗しました。';
      setStatus(`パスワードリセットメールを送信できませんでした。${message}`);
      setStatusType('error');
    }
  };

  const handleSignOut = async () => {
    setStatus('ログアウトしています...');
    setStatusType('info');

    try {
      await signOut();
      setStatus('ログアウトしました。');
      setStatusType('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログアウトに失敗しました。';
      setStatus(message);
      setStatusType('error');
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>ログイン</Text>
      <Text style={styles.description}>
        顧客管理、請求書履歴、クラウド保存を使うにはメールアドレスとパスワードでログインしてください。
      </Text>
      {!isSupabaseConfigured ? (
        <Text style={styles.errorStatus}>Supabase環境変数が未設定です。Free体験のみ利用できます。</Text>
      ) : user ? (
        <>
          <Text style={styles.successStatus}>ログイン中: {user.email ?? user.id}</Text>
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
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="パスワード"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={styles.actionRow} lightColor="transparent" darkColor="transparent">
            <Pressable style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText} lightColor="#ffffff" darkColor="#ffffff">
                ログイン
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleSignUp}>
              <Text style={styles.secondaryButtonText}>新規登録</Text>
            </Pressable>
          </View>
          <Pressable style={styles.linkButton} onPress={handlePasswordReset}>
            <Text style={styles.linkButtonText}>パスワードをリセット</Text>
          </Pressable>
        </>
      )}
      {status ? (
        <Text
          style={
            statusType === 'error'
              ? styles.errorStatus
              : statusType === 'success'
                ? styles.successStatus
                : styles.status
          }>
          {status}
        </Text>
      ) : null}
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  linkButtonText: {
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
  successStatus: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  errorStatus: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
});
