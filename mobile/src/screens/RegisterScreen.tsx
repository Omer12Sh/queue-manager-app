import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';

type RegisterRole = 'CLIENT' | 'SERVICE_PROVIDER';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'CLIENT' as RegisterRole,
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) return;
    setLoading(true);
    try {
      await authApi.register(form);
      Alert.alert(t('auth.register'), t('auth.accountCreated'));
      router.replace('/login');
    } catch {
      Alert.alert(t('auth.register'), t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { direction: dir }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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

      <View style={styles.logoArea}>
        <Text style={styles.logoEmoji}>✨</Text>
        <Text style={styles.appName}>{t('app.name')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, textAlignStyle]}>{t('auth.registerTitle')}</Text>

        <Text style={[styles.label, textAlignStyle]}>{t('auth.fullNameLabel')}</Text>
        <TextInput
          style={[styles.input, textAlignStyle]}
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder={t('auth.fullNamePlaceholder')}
        />

        <Text style={[styles.label, textAlignStyle]}>{t('auth.emailLabel')}</Text>
        <TextInput
          style={[styles.input, textAlignStyle]}
          value={form.email}
          onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.label, textAlignStyle]}>{t('auth.passwordLabel')}</Text>
        <TextInput
          style={[styles.input, textAlignStyle]}
          value={form.password}
          onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
          placeholder={t('auth.passwordMinLength')}
          secureTextEntry
        />

        <Text style={[styles.label, textAlignStyle]}>{t('auth.phoneLabel')}</Text>
        <TextInput
          style={[styles.input, textAlignStyle]}
          value={form.phone}
          onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, textAlignStyle]}>{t('auth.roleLabel')}</Text>
        <View style={[styles.roleRow, isRTL && styles.roleRowRtl]}>
          <TouchableOpacity
            style={[styles.roleBtn, form.role === 'CLIENT' && styles.roleBtnActive]}
            onPress={() => setForm((prev) => ({ ...prev, role: 'CLIENT' }))}
          >
            <Text style={[styles.roleText, form.role === 'CLIENT' && styles.roleTextActive]}>
              {t('auth.roleClient')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, form.role === 'SERVICE_PROVIDER' && styles.roleBtnActive]}
            onPress={() => setForm((prev) => ({ ...prev, role: 'SERVICE_PROVIDER' }))}
          >
            <Text style={[styles.roleText, form.role === 'SERVICE_PROVIDER' && styles.roleTextActive]}>
              {t('auth.roleProvider')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{t('auth.createAccount')}</Text>}
        </TouchableOpacity>

        <View style={[styles.footerRow, isRTL && styles.footerRowRtl]}>
          <Text style={styles.footerText}>{t('auth.haveAccount')}</Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
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
    marginBottom: 24,
  },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: '700', color: '#fff' },
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
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleRowRtl: {
    flexDirection: 'row-reverse',
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  roleBtnActive: {
    borderColor: '#c026d3',
    backgroundColor: '#fdf4ff',
  },
  roleText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  roleTextActive: {
    color: '#a21caf',
    fontWeight: '600',
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
    marginTop: 18,
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
});
