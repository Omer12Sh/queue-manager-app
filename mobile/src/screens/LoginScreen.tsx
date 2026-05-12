import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Screen = 'phone' | 'otp' | 'register' | 'email';

export default function LoginScreen() {
  const [screen, setScreen] = useState<Screen>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Email/password fallback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { loginWithToken } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  const handleRequestOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { Alert.alert('', t('auth.phoneLabel')); return; }
    setLoading(true);
    setDevCode(null);
    try {
      const res = await authApi.requestOtp(trimmed);
      if (res.data.devCode) setDevCode(res.data.devCode);
      setScreen('otp');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        Alert.alert('', 'Please wait before requesting a new code.');
      } else {
        Alert.alert('', t('validation.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone.trim(), otp.trim());
      if (res.data.needsRegistration) {
        setVerifiedToken(res.data.verifiedToken);
        setScreen('register');
      } else {
        // Logged in — update AuthContext so the tabs layout sees the user
        await loginWithToken(res.data.token, res.data.user);
        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert('', t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPhone = async () => {
    if (!name.trim()) { Alert.alert('', t('validation.nameRequired')); return; }
    setLoading(true);
    try {
      // Always register as CLIENT from the mobile app
      const res = await authApi.registerPhone({ verifiedToken, name: name.trim(), role: 'CLIENT' });
      await loginWithToken(res.data.token, res.data.user);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('', t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      await loginWithToken(res.data.token, res.data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 400) {
        Alert.alert(t('auth.signIn'), t('auth.invalidCredentials'));
      } else {
        Alert.alert(t('auth.signIn'), t('validation.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const LangSwitcher = () => (
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
  );

  const Logo = () => (
    <View style={styles.logoArea}>
      <Text style={styles.logoEmoji}>✨</Text>
      <Text style={styles.appName}>{t('app.name')}</Text>
      <Text style={styles.appTagline}>{t('app.taglineLong')}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.wrapper, { direction: dir }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LangSwitcher />
        <Logo />

        {/* ── Phone entry screen ─────────────────────────────── */}
        {screen === 'phone' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, textAlignStyle]}>{t('auth.signInTitle')}</Text>
            <Text style={[styles.cardSubtitle, textAlignStyle]}>{t('auth.phoneLabel')}</Text>

            <TextInput
              style={[styles.input, textAlignStyle]}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.phonePlaceholder')}
              keyboardType="phone-pad"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('auth.sendOtp', { defaultValue: 'Send verification code' })}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setScreen('email')} style={styles.altLink}>
              <Text style={styles.altLinkText}>{t('auth.useEmailLogin', { defaultValue: 'Sign in with email instead' })}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── OTP entry screen ───────────────────────────────── */}
        {screen === 'otp' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, textAlignStyle]}>{t('auth.enterCode', { defaultValue: 'Enter verification code' })}</Text>
            <Text style={[styles.cardSubtitle, textAlignStyle]}>{phone}</Text>

            {devCode !== null && (
              <View style={styles.devCodeBox}>
                <Text style={styles.devCodeLabel}>🛠 Dev mode code:</Text>
                <Text style={styles.devCode}>{devCode}</Text>
              </View>
            )}

            <TextInput
              style={[styles.otpInput, { textAlign: 'center' }]}
              value={otp}
              onChangeText={(v) => { setOtp(v.replace(/\D/g, '')); }}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.btn, (loading || otp.length < 6) && styles.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading || otp.length < 6}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('auth.verify', { defaultValue: 'Verify' })}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setScreen('phone'); setOtp(''); setDevCode(null); }} style={styles.altLink}>
              <Text style={styles.altLinkText}>{t('booking.back')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Registration screen ────────────────────────────── */}
        {screen === 'register' && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, textAlignStyle]}>{t('auth.registerTitle')}</Text>
            <Text style={[styles.cardSubtitle, textAlignStyle]}>{phone}</Text>

            <Text style={[styles.label, textAlignStyle]}>{t('auth.fullNameLabel')}</Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.fullNamePlaceholder')}
              autoFocus
            />

            <Text style={[styles.label, textAlignStyle]}>{t('auth.roleLabel')}</Text>
            <View style={styles.roleRow}>
              {(['CLIENT', 'SERVICE_PROVIDER'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {r === 'CLIENT' ? t('auth.roleClient') : t('auth.roleProvider')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegisterPhone}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('auth.createAccount')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Email / password fallback ──────────────────────── */}
        {screen === 'email' && (
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
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('auth.signIn')}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setScreen('phone')} style={styles.altLink}>
              <Text style={styles.altLinkText}>{t('auth.usePhoneLogin', { defaultValue: 'Sign in with phone instead' })}</Text>
            </TouchableOpacity>

            {/* Demo accounts */}
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

            <View style={[styles.footerRow, isRTL && styles.footerRowRtl]}>
              <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.footerLink}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#c026d3' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 48 },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 16 },
  langRowRtl: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  langBtnActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 12, color: '#fff', fontWeight: '500' },
  langLabelActive: { color: '#fff', fontWeight: '700' },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: '700', color: '#fff' },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', marginBottom: 12,
  },
  otpInput: {
    borderWidth: 2, borderColor: '#c026d3', borderRadius: 14,
    paddingVertical: 16, fontSize: 28, fontWeight: '700',
    color: '#111827', letterSpacing: 12, marginBottom: 16,
  },
  btn: {
    backgroundColor: '#c026d3', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  altLink: { alignItems: 'center', paddingVertical: 8 },
  altLinkText: { fontSize: 13, color: '#a21caf', fontWeight: '500' },
  devCodeBox: {
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 12,
    marginBottom: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#fbbf24',
  },
  devCodeLabel: { fontSize: 11, color: '#92400e', fontWeight: '500' },
  devCode: { fontSize: 28, fontWeight: '700', color: '#92400e', letterSpacing: 8, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  roleBtnActive: { borderColor: '#c026d3', backgroundColor: '#fdf4ff' },
  roleBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '500', textAlign: 'center' },
  roleBtnTextActive: { color: '#a21caf', fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  footerRowRtl: { flexDirection: 'row-reverse' },
  footerText: { fontSize: 13, color: '#6b7280' },
  footerLink: { fontSize: 13, color: '#a21caf', fontWeight: '600' },
  demoTitle: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 20, marginBottom: 8 },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoRowRtl: { flexDirection: 'row-reverse' },
  demoBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 8, paddingVertical: 7, alignItems: 'center',
  },
  demoBtnText: { fontSize: 11, color: '#6b7280' },
});
