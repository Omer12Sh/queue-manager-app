import '../src/i18n'; // initialise i18n
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '../src/contexts/LanguageContext';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

function AppContent() {
  const { isLoading } = useAuth();
  const { dir } = useLanguage();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#c026d3" />
      </View>
    );
  }
  return (
    <View style={[styles.container, { direction: dir }]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="book"
          options={{
            headerShown: true,
            headerTitle: t('booking.title'),
            headerTintColor: '#c026d3',
            headerStyle: { backgroundColor: '#fff' },
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
      </Stack>
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
