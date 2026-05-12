import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, type TextStyle,
} from 'react-native';
import { format, addDays, addMonths, startOfMonth, getDaysInMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { providerApi } from '../../src/services/api';
import { SUPPORTED_LANGUAGES } from '../../src/i18n';
import type { AvailabilityOverride } from '../../src/types';

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60];

const generateTimeSlots = (intervalMin: number): string[] => {
  const slots: string[] = [];
  const start = 6 * 60;
  const end = 22 * 60;
  for (let m = start; m < end; m += intervalMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return slots;
};

export default function SettingsTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { dir, language, setLanguage } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ businessName: '', description: '', address: '' });

  // Announcements
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; content: string }[]>([]);
  const [annForm, setAnnForm] = useState({ title: '', content: '' });
  const [annSaving, setAnnSaving] = useState(false);

  // Availability calendar
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [calMonth, setCalMonth] = useState(startOfMonth(new Date()));
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editIsOff, setEditIsOff] = useState(false);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [slotInterval, setSlotInterval] = useState(30);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      providerApi.getProfile(user.id),
      providerApi.getAnnouncements(user.id),
      providerApi.getAvailabilityOverrides(user.id),
    ]).then(([profileRes, annRes, ovRes]) => {
      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value.data;
        setForm({
          businessName: p.businessName ?? '',
          description: p.description ?? '',
          address: p.address ?? '',
        });
      }
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data);
      if (ovRes.status === 'fulfilled') setOverrides(ovRes.value.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await providerApi.updateProfile(form);
      Alert.alert('✅', t('settings.profileUpdated'));
    } catch {
      Alert.alert('', t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLanguage = async (lang: string) => {
    setLanguage(lang);
    try {
      await providerApi.updateProfile({ defaultLanguage: lang });
    } catch { /* applied locally anyway */ }
  };

  const handleAddAnn = async () => {
    if (!annForm.title.trim() || !annForm.content.trim()) return;
    setAnnSaving(true);
    try {
      const res = await providerApi.createAnnouncement(annForm);
      setAnnouncements((prev) => [res.data, ...prev]);
      setAnnForm({ title: '', content: '' });
    } catch {
      Alert.alert('', t('settings.annFailed'));
    } finally {
      setAnnSaving(false);
    }
  };

  const handleDeleteAnn = (id: string) => {
    Alert.alert('', t('settings.annDeleteConfirm', { defaultValue: 'Delete this announcement?' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await providerApi.deleteAnnouncement(id);
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        },
      },
    ]);
  };

  // Calendar helpers
  const calDays = Array.from({ length: getDaysInMonth(calMonth) }, (_, i) =>
    format(addDays(startOfMonth(calMonth), i), 'yyyy-MM-dd'),
  );
  const getOverride = (date: string) => overrides.find((o) => o.date === date);

  const openEditDate = (date: string) => {
    const ov = getOverride(date);
    setEditingDate(date);
    setEditIsOff(ov?.isOff ?? false);
    // slots is string[] (new format); fall back to empty if legacy {open,close} data or no slots
    setEditSlots(Array.isArray(ov?.slots) && ov.slots.length > 0 && typeof ov.slots[0] === 'string'
      ? [...ov.slots]
      : [],
    );
  };

  const handleSaveOverride = async () => {
    if (!editingDate) return;
    try {
      const res = await providerApi.upsertAvailabilityOverride({
        date: editingDate,
        isOff: editIsOff,
        slots: editIsOff ? [] : editSlots,
      });
      setOverrides((prev) => {
        const idx = prev.findIndex((o) => o.date === editingDate);
        if (idx >= 0) { const next = [...prev]; next[idx] = res.data; return next; }
        return [...prev, res.data];
      });
      Alert.alert('✅', t('settings.availabilityUpdated'));
      setEditingDate(null);
    } catch {
      Alert.alert('', t('settings.saveFailed'));
    }
  };

  const handleDeleteOverride = async (date: string) => {
    await providerApi.deleteAvailabilityOverride(date);
    setOverrides((prev) => prev.filter((o) => o.date !== date));
    Alert.alert('', t('settings.availabilityRemoved'));
    setEditingDate(null);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>;
  }

  return (
    <ScrollView style={[styles.container, { direction: dir }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, textAlignStyle]}>{t('settings.title')}</Text>
      <Text style={[styles.subtitle, textAlignStyle]}>{t('settings.subtitle')}</Text>

      {/* Business Profile */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>🏢 {t('settings.businessProfile')}</Text>
        {[
          { key: 'businessName', label: t('settings.businessNameLabel'), placeholder: '' },
          { key: 'description', label: t('settings.descriptionLabel'), placeholder: t('settings.descriptionPlaceholder') },
          { key: 'address', label: t('settings.addressLabel'), placeholder: t('settings.addressPlaceholder') },
        ].map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={[styles.label, textAlignStyle]}>{f.label}</Text>
            <TextInput
              style={[styles.input, textAlignStyle]}
              value={(form as Record<string, string>)[f.key]}
              onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
              placeholder={f.placeholder}
              multiline={f.key === 'description'}
              numberOfLines={f.key === 'description' ? 3 : 1}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? t('settings.savingProfile') : t('settings.saveProfile')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>🌐 {t('settings.languagePreference')}</Text>
        <View style={[styles.langRow, isRTL && styles.langRowRtl]}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
              onPress={() => handleSaveLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                {lang.label}
              </Text>
              {language === lang.code && <Text style={styles.langCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Monthly Availability Calendar */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>📅 {t('settings.monthlyAvailability')}</Text>
        <Text style={[styles.hint, textAlignStyle]}>{t('settings.monthlyAvailabilityHint')}</Text>

        {/* Month navigation */}
        <View style={[styles.monthNav, isRTL && styles.monthNavRtl]}>
          <TouchableOpacity onPress={() => setCalMonth((m) => addMonths(m, -1))} style={styles.monthNavBtn}>
            <Text style={styles.monthNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{format(calMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setCalMonth((m) => addMonths(m, 1))} style={styles.monthNavBtn}>
            <Text style={styles.monthNavText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.calHeader}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <Text key={d} style={styles.calHeaderDay}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {Array.from({ length: new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay() }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.calBlank} />
          ))}
          {calDays.map((date) => {
            const ov = getOverride(date);
            const dayNum = parseInt(date.split('-')[2], 10);
            return (
              <TouchableOpacity
                key={date}
                onPress={() => openEditDate(date)}
                style={[
                  styles.calDay,
                  ov?.isOff ? styles.calDayOff : ov ? styles.calDayOn : styles.calDayDefault,
                ]}
              >
                <Text style={[
                  styles.calDayNum,
                  (ov?.isOff ? styles.calDayOffText : ov ? styles.calDayOnText : null) ?? null,
                ]}>
                  {dayNum}
                </Text>
                {ov && <Text style={styles.calDayMark}>{ov.isOff ? '✕' : '✓'}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.hint, textAlignStyle, { marginTop: 6 }]}>{t('settings.calendarLegend')}</Text>

        {/* Edit date panel */}
        {editingDate !== null && (
          <View style={styles.editPanel}>
            <View style={[styles.editPanelHeader, isRTL && styles.editPanelHeaderRtl]}>
              <Text style={[styles.editPanelDate, textAlignStyle]}>{editingDate}</Text>
              <TouchableOpacity onPress={() => setEditingDate(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Day off toggle */}
            <TouchableOpacity
              style={[styles.toggleRow, isRTL && styles.toggleRowRtl]}
              onPress={() => setEditIsOff((v) => !v)}
            >
              <View style={[styles.checkbox, editIsOff && styles.checkboxChecked]}>
                {editIsOff && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={[styles.toggleLabel, textAlignStyle]}>{t('settings.markDayOff')}</Text>
            </TouchableOpacity>

            {!editIsOff && (
              <>
                {/* Interval selector */}
                <View style={[styles.intervalRow, isRTL && styles.intervalRowRtl]}>
                  <Text style={[styles.slotSubLabel, { marginBottom: 0 }]}>{t('settings.slotIntervalLabel')}</Text>
                  {INTERVAL_OPTIONS.map((iv) => (
                    <TouchableOpacity
                      key={iv}
                      style={[styles.timePill, slotInterval === iv && styles.timePillSelected]}
                      onPress={() => setSlotInterval(iv)}
                    >
                      <Text style={[styles.timePillText, slotInterval === iv && styles.timePillTextSelected]}>
                        {iv}{t('settings.minAbbr')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.slotSubLabel}>{t('settings.selectTimeSlots')}</Text>
                {/* Slot grid */}
                <View style={styles.slotGrid}>
                  {generateTimeSlots(slotInterval).map((ts) => {
                    const isSelected = editSlots.includes(ts);
                    return (
                      <TouchableOpacity
                        key={ts}
                        style={[styles.timePill, isSelected && styles.timePillSelected]}
                        onPress={() => setEditSlots((prev) =>
                          isSelected ? prev.filter((s) => s !== ts) : [...prev, ts].sort(),
                        )}
                      >
                        <Text style={[styles.timePillText, isSelected && styles.timePillTextSelected]}>
                          {ts}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.slotSubLabel}>
                  {editSlots.length > 0 ? `${editSlots.length} ${t('settings.slotsSelected')}` : t('settings.noSlotsSelected')}
                </Text>
              </>
            )}

            <View style={[styles.editActions, isRTL && styles.editActionsRtl]}>
              <TouchableOpacity style={styles.saveDateBtn} onPress={handleSaveOverride}>
                <Text style={styles.saveDateBtnText}>{t('settings.saveDate')}</Text>
              </TouchableOpacity>
              {getOverride(editingDate) && (
                <TouchableOpacity
                  style={styles.removeDateBtn}
                  onPress={() => handleDeleteOverride(editingDate)}
                >
                  <Text style={styles.removeDateBtnText}>{t('settings.removeOverride')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Announcements */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>📢 {t('settings.announcements')}</Text>
        <View style={styles.field}>
          <TextInput
            style={[styles.input, textAlignStyle]}
            value={annForm.title}
            onChangeText={(v) => setAnnForm((p) => ({ ...p, title: v }))}
            placeholder={t('settings.annTitlePlaceholder')}
          />
        </View>
        <View style={styles.field}>
          <TextInput
            style={[styles.input, styles.textArea, textAlignStyle]}
            value={annForm.content}
            onChangeText={(v) => setAnnForm((p) => ({ ...p, content: v }))}
            placeholder={t('settings.annContentPlaceholder')}
            multiline
            numberOfLines={3}
          />
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, annSaving && styles.saveBtnDisabled]}
          onPress={handleAddAnn}
          disabled={annSaving}
        >
          <Text style={styles.saveBtnText}>{t('settings.postAnnouncement')}</Text>
        </TouchableOpacity>

        {announcements.map((ann) => (
          <View key={ann.id} style={[styles.annCard, isRTL && styles.annCardRtl]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.annTitle, textAlignStyle]}>{ann.title}</Text>
              <Text style={[styles.annContent, textAlignStyle]}>{ann.content}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteAnn(ann.id)}>
              <Text style={styles.deleteAnn}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  hint: { fontSize: 11, color: '#9ca3af', marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 4 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, padding: 10, fontSize: 14, color: '#111827',
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#c026d3', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Language
  langRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  langRowRtl: { flexDirection: 'row-reverse' },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  langBtnActive: { borderColor: '#c026d3', backgroundColor: '#fdf4ff' },
  langFlag: { fontSize: 18 },
  langLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  langLabelActive: { color: '#a21caf', fontWeight: '700' },
  langCheck: { color: '#c026d3', fontWeight: '700', fontSize: 12 },
  // Calendar
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthNavRtl: { flexDirection: 'row-reverse' },
  monthNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  monthNavText: { fontSize: 18, color: '#374151', fontWeight: '700' },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  calHeader: { flexDirection: 'row', marginBottom: 4 },
  calHeaderDay: { flex: 1, textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calBlank: { width: `${100 / 7}%`, aspectRatio: 1 },
  calDay: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6',
  },
  calDayDefault: { backgroundColor: '#fff' },
  calDayOn: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  calDayOff: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  calDayNum: { fontSize: 11, fontWeight: '600', color: '#374151' },
  calDayOnText: { color: '#065f46' },
  calDayOffText: { color: '#b91c1c' },
  calDayMark: { fontSize: 7, marginTop: 1 },
  // Edit panel
  editPanel: {
    marginTop: 12, padding: 14, backgroundColor: '#fdf4ff',
    borderRadius: 14, borderWidth: 1, borderColor: '#e9d5ff',
  },
  editPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  editPanelHeaderRtl: { flexDirection: 'row-reverse' },
  editPanelDate: { fontSize: 14, fontWeight: '700', color: '#6d28d9' },
  closeBtn: { fontSize: 16, color: '#9ca3af' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  toggleRowRtl: { flexDirection: 'row-reverse' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db',
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#c026d3', borderColor: '#c026d3' },
  checkboxMark: { color: '#fff', fontSize: 10, fontWeight: '700' },
  toggleLabel: { fontSize: 13, color: '#374151' },
  slotSubLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4, marginTop: 6 },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  intervalRowRtl: { flexDirection: 'row-reverse' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  timePill: {
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  timePillSelected: { backgroundColor: '#c026d3', borderColor: '#c026d3' },
  timePillText: { fontSize: 11, color: '#374151' },
  timePillTextSelected: { color: '#fff', fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editActionsRtl: { flexDirection: 'row-reverse' },
  saveDateBtn: {
    flex: 1, backgroundColor: '#c026d3', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  saveDateBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  removeDateBtn: {
    flex: 1, borderWidth: 1, borderColor: '#fca5a5', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  removeDateBtnText: { color: '#ef4444', fontSize: 13 },
  // Announcements
  annCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
    marginTop: 8, borderStartWidth: 3, borderStartColor: '#c026d3',
  },
  annCardRtl: { flexDirection: 'row-reverse' },
  annTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  annContent: { fontSize: 12, color: '#374151' },
  deleteAnn: { fontSize: 16, color: '#9ca3af' },
});
