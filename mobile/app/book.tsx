import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Alert, type TextStyle,
} from 'react-native';
import { format, addDays, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useLanguage } from '../src/contexts/LanguageContext';
import { userApi, providerApi, appointmentApi } from '../src/services/api';
import type { Service, TimeSlot, ProviderProfile } from '../src/types';

interface BookingProvider {
  id: string;
  name: string;
  providerProfile?: ProviderProfile;
}

export default function BookScreen() {
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left' };

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [selectedProvider, setSelectedProvider] = useState<BookingProvider | null>(null);
  const [providerServices, setProviderServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Next 14 days starting tomorrow
  const dates = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
  );
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1: load providers
  useEffect(() => {
    userApi.getAll()
      .then((res) => setProviders(res.data))
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));
  }, []);

  // Step 2: load provider services when provider selected
  useEffect(() => {
    if (!selectedProvider) return;
    setLoadingServices(true);
    providerApi.getProfile(selectedProvider.id)
      .then((res) => {
        const profile: ProviderProfile & { services?: Service[] } = res.data;
        setProviderServices(profile.services ?? []);
      })
      .catch(() => setProviderServices([]))
      .finally(() => setLoadingServices(false));
  }, [selectedProvider]);

  // Step 4: load slots when date selected
  useEffect(() => {
    if (!selectedProvider || !selectedService || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    appointmentApi.getAvailableSlots(selectedProvider.id, selectedDate, selectedService.id)
      .then((res) => setSlots(res.data))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedProvider, selectedService]);

  const handleSubmit = async () => {
    if (!selectedProvider || !selectedService || !selectedSlot) return;
    setSubmitting(true);
    try {
      await appointmentApi.create({
        providerId: selectedProvider.id,
        serviceId: selectedService.id,
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

  const StepIndicator = () => (
    <View style={[styles.stepRow, isRTL && styles.stepRowRtl]}>
      {[
        t('booking.stepProvider'),
        t('booking.stepService'),
        t('booking.stepDate'),
        t('booking.stepTime'),
        t('booking.stepConfirm'),
      ].map((label, i) => (
        <React.Fragment key={i}>
          <View style={[styles.stepDot, step > i + 1 && styles.stepDotDone, step === i + 1 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, (step >= i + 1) && styles.stepNumActive]}>{i + 1}</Text>
          </View>
          {i < 4 && <View style={[styles.stepLine, step > i + 1 && styles.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );

  // ── Step 1: Choose Provider ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseProvider')}</Text>
        {loadingProviders ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>
        ) : providers.length === 0 ? (
          <View style={styles.centered}><Text style={styles.emptyText}>{t('booking.noProviders')}</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {providers.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.card, selectedProvider?.id === p.id && styles.cardSelected]}
                onPress={() => {
                  setSelectedProvider(p);
                  setStep(2);
                }}
              >
                <View style={styles.providerAvatar}>
                  <Text style={styles.avatarEmoji}>✂️</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, textAlignStyle]}>
                    {p.providerProfile?.businessName || p.name}
                  </Text>
                  {p.providerProfile?.description && (
                    <Text style={[styles.cardSub, textAlignStyle]} numberOfLines={2}>
                      {p.providerProfile.description}
                    </Text>
                  )}
                  {p.providerProfile?.address && (
                    <Text style={[styles.cardMeta, textAlignStyle]}>📍 {p.providerProfile.address}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Step 2: Choose Service ────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseService')}</Text>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
          <Text style={styles.backText}>{t('booking.back')}</Text>
        </TouchableOpacity>
        {loadingServices ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>
        ) : providerServices.length === 0 ? (
          <View style={styles.centered}><Text style={styles.emptyText}>{t('services.noServices')}</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {providerServices.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.card, selectedService?.id === svc.id && styles.cardSelected]}
                onPress={() => {
                  setSelectedService(svc);
                  setStep(3);
                }}
              >
                <View style={styles.svcIcon}>
                  <Text style={styles.avatarEmoji}>✨</Text>
                </View>
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
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Step 3: Choose Date ───────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseDate')}</Text>
        <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
          <Text style={styles.backText}>{t('booking.back')}</Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}
          contentContainerStyle={styles.dateContent}>
          {dates.map((d) => {
            const dateObj = new Date(d + 'T12:00:00Z');
            const isSelected = d === selectedDate;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dateTile, isSelected && styles.dateTileSelected]}
                onPress={() => { setSelectedDate(d); setStep(4); }}
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
      </View>
    );
  }

  // ── Step 4: Choose Time ───────────────────────────────────────────────────
  if (step === 4) {
    return (
      <View style={[styles.container, { direction: dir }]}>
        <StepIndicator />
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.chooseTime')}</Text>
        <TouchableOpacity onPress={() => setStep(3)} style={styles.backBtn}>
          <Text style={styles.backText}>{t('booking.backToDates')}</Text>
        </TouchableOpacity>
        {loadingSlots ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>
        ) : slots.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t('booking.noSlots')}</Text>
            <TouchableOpacity onPress={() => setStep(3)} style={styles.backBtn}>
              <Text style={styles.backText}>{t('booking.backToDates')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.slotGrid}>
            {slots.map((slot) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <TouchableOpacity
                  key={slot.startTime}
                  style={[styles.slotTile, isSelected && styles.slotTileSelected]}
                  onPress={() => { setSelectedSlot(slot); setStep(5); }}
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

  // ── Step 5: Confirm ───────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { direction: dir }]}>
      <StepIndicator />
      <ScrollView contentContainerStyle={styles.confirmContent}>
        <Text style={[styles.stepTitle, textAlignStyle]}>{t('booking.confirmTitle')}</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          {[
            { label: t('booking.providerLabel'), value: selectedProvider?.providerProfile?.businessName || selectedProvider?.name || '' },
            { label: t('booking.serviceLabel'), value: selectedService?.name || '' },
            { label: t('booking.dateLabel'), value: selectedDate ? format(new Date(selectedDate + 'T12:00:00Z'), 'EEEE, d MMM yyyy') : '' },
            { label: t('booking.timeLabel'), value: selectedSlot ? format(parseISO(selectedSlot.startTime), 'HH:mm') : '' },
            { label: t('booking.durationLabel'), value: `${selectedService?.durationMin} ${t('booking.minutes')}` },
            { label: t('booking.priceLabel'), value: `₪${selectedService?.price}` },
          ].map((row) => (
            <View key={row.label} style={[styles.summaryRow, isRTL && styles.summaryRowRtl]}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
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
          <TouchableOpacity onPress={() => setStep(4)} style={styles.backBtnLarge}>
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
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
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

  stepTitle: { fontSize: 17, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginBottom: 12 },

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
  list: { padding: 16, gap: 10 },

  // Provider / Service cards
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardSelected: { borderColor: '#c026d3', backgroundColor: '#fdf4ff' },
  providerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#fdf4ff', justifyContent: 'center', alignItems: 'center',
  },
  svcIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#fdf4ff', justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  cardMeta: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  svcMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  svcMetaRtl: { flexDirection: 'row-reverse' },
  svcPrice: { fontSize: 15, fontWeight: '700', color: '#a21caf' },

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
