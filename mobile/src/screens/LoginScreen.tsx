import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('auth.signIn'), t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { direction: dir }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Language switcher */}
      <View style={[styles.langRow, isRTL && styles.langRowRtl]}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => setLanguage(lang.code)}
            style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
              {lang.code.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logo */}
      <View style={styles.logoArea}>
        <Text style={styles.logoEmoji}>✨</Text>
        <Text style={styles.appName}>{t('app.name')}</Text>
        <Text style={styles.appTagline}>{t('app.taglineLong')}</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, textAlignStyle]}>{t('auth.signInTitle')}</Text>

        <Text style={[styles.label, textAlignStyle]}>{t('auth.emailLabel')}</Text>
        <TextInput
          style={[styles.input, textAlignStyle]}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.label, textAlignStyle]}>{t('auth.passwordLabel')}</Text>
        <TextInput
          style={[styles.input, textAlignStyle]}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{t('auth.signIn')}</Text>}
        </TouchableOpacity>

        <View style={[styles.footerRow, isRTL && styles.footerRowRtl]}>
          <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.footerLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>

        {/* Demo quick-fill */}
        <Text style={styles.demoTitle}>{t('auth.demoAccounts')}</Text>
        <View style={[styles.demoRow, isRTL && styles.demoRowRtl]}>
          {[
            { label: 'Admin', email: 'admin@queue.app', pw: 'Admin123!' },
            { label: 'Provider', email: 'provider@queue.app', pw: 'Provider123!' },
            { label: 'Client', email: 'client@queue.app', pw: 'Client123!' },
          ].map((acc) => (
            <TouchableOpacity
              key={acc.label}
              style={styles.demoBtn}
              onPress={() => { setEmail(acc.email); setPassword(acc.pw); }}
            >
              <Text style={styles.demoBtnText}>{acc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#c026d3',
    justifyContent: 'center',
    padding: 24,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  langRowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  langBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 12, color: '#fff', fontWeight: '500' },
  langLabelActive: { color: '#fff', fontWeight: '700' },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: '700', color: '#fff' },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  btn: {
    backgroundColor: '#c026d3',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  footerRowRtl: {
    flexDirection: 'row-reverse',
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 13,
    color: '#a21caf',
    fontWeight: '600',
  },
  demoTitle: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoRowRtl: { flexDirection: 'row-reverse' },
  demoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  demoBtnText: { fontSize: 11, color: '#6b7280' },
});
