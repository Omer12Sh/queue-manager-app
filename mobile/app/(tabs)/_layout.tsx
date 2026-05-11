import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#c026d3" />
    </View>;
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#c026d3',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#c026d3',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.dashboard'),
          tabBarLabel: t('nav.dashboard'),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: t('nav.appointments'),
          tabBarLabel: t('nav.appointments'),
        }}
      />
      {(user.role === 'SERVICE_PROVIDER' || user.role === 'ADMIN') && (
        <Tabs.Screen
          name="services"
          options={{
            title: t('nav.services'),
            tabBarLabel: t('nav.services'),
          }}
        />
      )}
    </Tabs>
  );
}
