import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  const { user, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const { dir } = useLanguage();

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#c026d3" />
    </View>;
  }

  if (!user) return <Redirect href="/login" />;

  const handleLogout = () => {
    Alert.alert(
      t('nav.logout'),
      t('auth.logoutConfirm', { defaultValue: 'Sign out of your account?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        { text: t('nav.logout'), style: 'destructive', onPress: logout },
      ],
    );
  };

  const LogoutButton = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 14 }}>
      <Ionicons name="log-out-outline" size={24} color="#c026d3" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#c026d3',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { direction: dir },
        sceneStyle: { direction: dir },
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#c026d3',
        headerTitleStyle: { fontWeight: '600' },
        headerRight: () => <LogoutButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.dashboard'),
          tabBarLabel: t('nav.dashboard'),
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: t('nav.appointments'),
          tabBarLabel: t('nav.appointments'),
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('nav.services'),
          tabBarLabel: t('nav.services'),
          tabBarIcon: ({ color }) => <Ionicons name="cut-outline" size={22} color={color} />,
          // Hide this tab entirely for clients – they browse services during booking
          href: user.role === 'CLIENT' ? null : undefined,
        }}
      />
    </Tabs>
  );
}
