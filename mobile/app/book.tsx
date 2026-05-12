import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Alert, type TextStyle, BackHandler,
} from 'react-native';
import { format, addDays, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { useLanguage } from '../src/contexts/LanguageContext';
import { userApi, providerApi, appointmentApi } from '../src/services/api';
import type { Service, TimeSlot, ProviderProfile, AvailabilityOverride } from '../src/types';

interface BookingProvider {
  id: string;
  name: string;
  providerProfile?: ProviderProfile;
}

type Step = 'service' | 'date' | 'time' | 'confirm';

export default function BookScreen() {
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const router = useRouter();
  const navigation = useNavigation();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  const [step, setStep] = useState<Step>('service');
  const [provider, setProvider] = useState<BookingProvider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dates that have active availability overrides
  const availableDates = Array.from({ length: 60 }, (_, i) =>
    format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
  ).filter((date) => {
    const ov = overrides.find((o) => o.date === date);
    return ov && !ov.isOff && ov.slots.length > 0;
  });

  // Intercept hardware/gesture back to navigate steps instead of leaving the screen
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (step === 'service') {
          router.back();
        } else if (step === 'date') {
          setStep('service');
        } else if (step === 'time') {
          setStep('date');
        } else if (step === 'confirm') {
          setStep('time');
        }
        return true; // prevent default navigation
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [step, router]),
  );

  // Hide the native header back arrow; we handle back ourselves
  useEffect(() => {
    navigation.setOptions({ headerLeft: () => null });
  }, [navigation]);

  // Load provider, services and availability on mount
  useEffect(() => {
    userApi.getAll({ role: 'SERVICE_PROVIDER' })
      .then(async (res) => {
        const providers: BookingProvider[] = res.data;
        if (providers.length === 0) { setLoadError(t('booking.noProviders')); return; }
        const p = providers[0];
        setProvider(p);
        const [svcRes, ovRes] = await Promise.allSettled([
          providerApi.getProfile(p.id),
          providerApi.getAvailabilityOverrides(p.id),
        ]);
        if (svcRes.status === 'fulfilled') {
          const profile: ProviderProfile & { services?: Service[] } = svcRes.value.data;
          setServices(profile.services ?? []);
          if (!profile.services?.length) setLoadError(t('booking.noServices'));
        }
        if (ovRes.status === 'fulfilled') setOverrides(ovRes.value.data);
      })
      .catch(() => setLoadError(t('booking.loadFailed')))
      .finally(() => setLoadingInit(false));
  }, [t]);

  const toggleService = (svc: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === svc.id) ? prev.filter((s) => s.id !== svc.id) : [...prev, svc],
    );
  };

  const totalDuration = selectedServices.reduce((s, svc) => s + svc.durationMin, 0);
  const totalPrice = selectedServices.reduce((s, svc) => s + svc.price, 0);

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setLoadingSlots(true);
    setSelectedSlot(null);
    setStep('time');
    try {
      const res = await appointmentApi.getAvailableSlots(
        provider!.id,
        date,
        selectedServices.map((s) => s.id),
      );
      setSlots(res.data);
    } catch {
      Alert.alert(t('booking.title'), t('booking.loadFailed'));
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async () => {
    if (!provider || selectedServices.length === 0 || !selectedSlot) return;
    setSubmitting(true);
    try {
      await appointmentApi.create({
        providerId: provider.id,
        serviceIds: selectedServices.map((s) => s.id),
        startTime: selectedSlot.startTime,
        notes: notes.trim() || undefined,
      });
      Alert.alert('✅', t('booking.bookingSuccess'), [
        { text: 'OK', onPress: () => router.replace('/(tabs)/appointments') },
      ]);
    } catch {
      Alert.alert(t('booking.title'), t('booking.bookingFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 'service') router.back();
    else if (step === 'date') setStep('service');
    else if (step === 'time') setStep('date');
    else setStep('time');
  };

  const stepOrder: Step[] = ['service', 'date', 'time', 'confirm'];
  const stepLabels = [
    t('booking.stepService'),
    t('booking.stepDate'),
    t('booking.stepTime'),
    t('booking.stepConfirm'),
  ];
  const stepIndex = stepOrder.indexOf(step);

  const StepIndicator = () => (
    <View style={[styles.stepRow, isRTL && styles.stepRowRtl]}>
      {stepLabels.map((label, i) => (
        <React.Fragment key={label}>
          <View style={[
            styles.stepDot,
            i < stepIndex && styles.stepDotDone,
            i === stepIndex && styles.stepDotActive,
          ]}>
            <Text style={[styles.stepNum, i <= stepIndex && styles.stepNumActive]}>{i + 1}</Text>
          </View>
          {i < stepLabels.length - 1 && (
            <View style={[styles.stepLine, i < stepIndex && styles.stepLineDone]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const BackBtn = ({ label }: { label?: string }) => (
    <TouchableOpacity onPress={goBack} style={styles.backBtn}>
      <Text style={styles.backText}>{label ?? t('booking.back')}</Text>
    </TouchableOpacity>
  );

  if (loadingInit) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>;
  }

  if (loadError) {
    return (
      <View style={[styles.container, styles.centered, { direction: dir }]}>
        <Text style={[styles.emptyText, textAlignStyle]}>{loadError}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { marginTop: 16 }]}>
          <Text style={styles.backText}>{t('booking.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Step: Choose Service(s) ───────────────────────────────────────────────
  if (step === 'service') {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseService')}</Text>
        <Text style={[styles.stepHint, textAlignStyle]}>{t('booking.chooseServiceHint')}</Text>
        <ScrollView contentContainerStyle={styles.list}>
          {services.map((svc) => {
            const selected = !!selectedServices.find((s) => s.id === svc.id);
            return (
              <TouchableOpacity
                key={svc.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => toggleService(svc)}
              >
                <View style={styles.svcIcon}><Text style={styles.avatarEmoji}>✨</Text></View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, textAlignStyle]}>{svc.name}</Text>
                  {svc.description && (
                    <Text style={[styles.cardSub, textAlignStyle]} numberOfLines={2}>{svc.description}</Text>
                  )}
                  <View style={[styles.svcMeta, isRTL && styles.svcMetaRtl]}>
                    <Text style={styles.cardMeta}>⏱ {svc.durationMin} {t('booking.minutes')}</Text>
                    <Text style={styles.svcPrice}>₪{svc.price}</Text>
                  </View>
                </View>
                <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
                  {selected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedServices.length > 0 && (
          <View style={[styles.selectionBar, isRTL && styles.selectionBarRtl]}>
            <Text style={[styles.selectionText, { flex: 1 }]}>
              {selectedServices.length} {t('booking.servicesSelected')} · {totalDuration}min · ₪{totalPrice}
            </Text>
            <TouchableOpacity onPress={() => setStep('date')} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{t('booking.next')} →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Step: Choose Date ─────────────────────────────────────────────────────
  if (step === 'date') {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseDate')}</Text>
        <BackBtn />
        {availableDates.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, textAlignStyle]}>{t('booking.noAvailableDates')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}
            contentContainerStyle={styles.dateContent}>
            {availableDates.map((d) => {
              const [y, m, day] = d.split('-').map(Number);
              const dateObj = new Date(y, m - 1, day);
              const isSelected = d === selectedDate;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateTile, isSelected && styles.dateTileSelected]}
                  onPress={() => handleSelectDate(d)}
                >
                  <Text style={[styles.dateTileDay, isSelected && styles.dateTileDaySelected]}>
                    {format(dateObj, 'EEE')}
                  </Text>
                  <Text style={[styles.dateTileNum, isSelected && styles.dateTileNumSelected]}>
                    {format(dateObj, 'd')}
                  </Text>
                  <Text style={[styles.dateTileMon, isSelected && styles.dateTileMonSelected]}>
                    {format(dateObj, 'MMM')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Step: Choose Time ─────────────────────────────────────────────────────
  if (step === 'time') {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseTime')}</Text>
        <BackBtn label={t('booking.backToDates')} />
        {loadingSlots ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>
        ) : slots.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, textAlignStyle]}>{t('booking.noSlots')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.slotGrid}>
            {slots.map((slot) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <TouchableOpacity
                  key={slot.startTime}
                  style={[styles.slotTile, isSelected && styles.slotTileSelected]}
                  onPress={() => { setSelectedSlot(slot); setStep('confirm'); }}
                >
                  <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected]}>
                    {format(parseISO(slot.startTime), 'HH:mm')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Step: Confirm ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { direction: dir }]}>
      <StepIndicator />
      <ScrollView contentContainerStyle={styles.confirmContent}>
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.confirmTitle')}</Text>

        <View style={styles.summaryCard}>
          {[
            { label: t('booking.providerLabel'), value: provider?.providerProfile?.businessName || provider?.name || '' },
            { label: t('booking.dateLabel'), value: selectedDate ? format(parseISO(selectedDate), 'EEEE, d MMM yyyy') : '' },
            { label: t('booking.timeLabel'), value: selectedSlot ? format(parseISO(selectedSlot.startTime), 'HH:mm') : '' },
            { label: t('booking.durationLabel'), value: `${totalDuration} ${t('booking.minutes')}` },
            { label: t('booking.priceLabel'), value: `₪${totalPrice}` },
          ].map((row) => (
            <View key={row.label} style={[styles.summaryRow, isRTL && styles.summaryRowRtl]}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
          {/* Selected services */}
          <View style={[styles.summaryRow, isRTL && styles.summaryRowRtl, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.summaryLabel}>{t('booking.serviceLabel')}</Text>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              {selectedServices.map((svc) => (
                <Text key={svc.id} style={styles.summaryValue}>{svc.name}</Text>
              ))}
            </View>
          </View>
        </View>

        <Text style={[styles.notesLabel, textAlignStyle]}>{t('booking.notesLabel')}</Text>
        <TextInput
          style={[styles.notesInput, textAlignStyle]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('booking.notesPlaceholder')}
          multiline
          numberOfLines={3}
        />

        <View style={[styles.confirmActions, isRTL && styles.confirmActionsRtl]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtnLarge}>
            <Text style={styles.backText}>{t('booking.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>{t('booking.confirmButton')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  stepRowRtl: { flexDirection: 'row-reverse' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: '#c026d3' },
  stepDotDone: { backgroundColor: '#a21caf' },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb' },
  stepLineDone: { backgroundColor: '#a21caf' },

  stepTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginBottom: 4 },
  stepHint: { fontSize: 12, color: '#9ca3af', paddingHorizontal: 20, marginBottom: 10 },

  // Back button
  backBtn: { paddingHorizontal: 20, paddingBottom: 8 },
  backBtnLarge: {
    flex: 1,
    borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#fff',
  },
  backText: { color: '#6b7280', fontSize: 13, fontWeight: '500' },

  // List
  list: { padding: 16, gap: 10, paddingBottom: 100 },

  // Service cards
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardSelected: { borderColor: '#c026d3', backgroundColor: '#fdf4ff' },
  svcIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#fdf4ff', justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  cardMeta: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  svcMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  svcMetaRtl: { flexDirection: 'row-reverse' },
  svcPrice: { fontSize: 14, fontWeight: '700', color: '#a21caf' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center',
  },
  checkCircleSelected: { backgroundColor: '#c026d3', borderColor: '#c026d3' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Selection bar
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6',
    padding: 14, paddingHorizontal: 16,
  },
  selectionBarRtl: { flexDirection: 'row-reverse' },
  selectionText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  nextBtn: {
    backgroundColor: '#c026d3', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Date picker
  dateScroll: { flexGrow: 0, paddingVertical: 8 },
  dateContent: { paddingHorizontal: 16, gap: 10, flexDirection: 'row' },
  dateTile: {
    width: 64, paddingVertical: 12, borderRadius: 16,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dateTileSelected: { backgroundColor: '#c026d3', borderColor: '#a21caf' },
  dateTileDay: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  dateTileDaySelected: { color: 'rgba(255,255,255,0.8)' },
  dateTileNum: { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 26 },
  dateTileNumSelected: { color: '#fff' },
  dateTileMon: { fontSize: 10, color: '#9ca3af' },
  dateTileMonSelected: { color: 'rgba(255,255,255,0.7)' },

  // Time slots
  slotGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotTile: {
    width: '30%', paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  slotTileSelected: { backgroundColor: '#c026d3', borderColor: '#a21caf' },
  slotTime: { fontSize: 15, fontWeight: '700', color: '#374151' },
  slotTimeSelected: { color: '#fff' },

  // Confirm
  confirmContent: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  summaryRowRtl: { flexDirection: 'row-reverse' },
  summaryLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  notesLabel: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 6 },
  notesInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#111827',
    minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmActionsRtl: { flexDirection: 'row-reverse' },
  confirmBtn: {
    flex: 2, backgroundColor: '#c026d3',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

