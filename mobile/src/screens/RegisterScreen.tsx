import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, type TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n';

type ValidationErrors = Partial<Record<'name' | 'email' | 'password' | 'phone', string>>;

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left' };
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: ValidationErrors = {};
    // Name: letters (including Unicode/Hebrew) and spaces only
    if (!form.name.trim()) {
      errs.name = t('validation.nameRequired');
    } else if (!/^[\p{L}\s'-]+$/u.test(form.name.trim())) {
      errs.name = t('validation.nameInvalid');
    }
    // Email
    if (!form.email.trim()) {
      errs.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = t('validation.emailInvalid');
    }
    // Password
    if (!form.password) {
      errs.password = t('validation.passwordRequired');
    } else if (form.password.length < 8) {
      errs.password = t('validation.passwordTooShort');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errs.password = t('validation.passwordWeak');
    }
    // Phone (optional but validated if provided)
    if (form.phone && !/^\+?[\d\s\-()]{7,20}$/.test(form.phone)) {
      errs.phone = t('validation.phoneInvalid');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({ ...form, role: 'CLIENT' });
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
      style={[styles.wrapper, { direction: dir }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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

        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>✨</Text>
          <Text style={styles.appName}>{t('app.name')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, textAlignStyle]}>{t('auth.registerTitle')}</Text>

          {/* Name */}
          <Text style={[styles.label, textAlignStyle]}>{t('auth.fullNameLabel')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(name) => { setForm((prev) => ({ ...prev, name })); setErrors((e) => ({ ...e, name: undefined })); }}
            placeholder={t('auth.fullNamePlaceholder')}
            autoCorrect={false}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          {/* Email */}
          <Text style={[styles.label, textAlignStyle]}>{t('auth.emailLabel')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle, errors.email && styles.inputError]}
            value={form.email}
            onChangeText={(email) => { setForm((prev) => ({ ...prev, email })); setErrors((e) => ({ ...e, email: undefined })); }}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <Text style={[styles.label, textAlignStyle]}>{t('auth.passwordLabel')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle, errors.password && styles.inputError]}
            value={form.password}
            onChangeText={(password) => { setForm((prev) => ({ ...prev, password })); setErrors((e) => ({ ...e, password: undefined })); }}
            placeholder={t('auth.passwordMinLength')}
            secureTextEntry
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Phone */}
          <Text style={[styles.label, textAlignStyle]}>{t('auth.phoneLabel')}</Text>
          <TextInput
            style={[styles.input, textAlignStyle, errors.phone && styles.inputError]}
            value={form.phone}
            onChangeText={(phone) => { setForm((prev) => ({ ...prev, phone })); setErrors((e) => ({ ...e, phone: undefined })); }}
            placeholder={t('auth.phonePlaceholder')}
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#c026d3' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 48,
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
    marginBottom: 4,
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 11, color: '#ef4444', marginBottom: 10 },
  btn: {
    backgroundColor: '#c026d3',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
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
