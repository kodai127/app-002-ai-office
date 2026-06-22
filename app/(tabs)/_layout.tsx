import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { getCurrentUser } from '@/lib/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'house',
                android: 'home',
                web: 'home',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          href: currentUser ? undefined : null,
          title: '案件',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'briefcase',
                android: 'work',
                web: 'work',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          href: currentUser ? undefined : null,
          title: '顧客',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.2',
                android: 'people',
                web: 'people',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="estimate"
        options={{
          href: currentUser ? undefined : null,
          title: '見積',
          tabBarLabel: '見積',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'doc.text',
                android: 'description',
                web: 'description',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoice"
        options={{
          href: currentUser ? undefined : null,
          title: '請求書',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'creditcard',
                android: 'receipt',
                web: 'receipt',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: currentUser ? undefined : null,
          title: '設定',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'gearshape',
                android: 'settings',
                web: 'settings',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
