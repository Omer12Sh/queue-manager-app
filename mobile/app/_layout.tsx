import '../src/i18n'; // initialise i18n
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';

function AppContent() {
  const { isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#c026d3" />
      </View>
    );
  }
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toast />
    </>
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
