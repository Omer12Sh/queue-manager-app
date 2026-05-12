import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, type TextStyle,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { appointmentApi } from '../../src/services/api';
import type { Appointment, AppointmentStatus } from '../../src/types';

export default function AppointmentsTab() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };
  const router = useRouter();
  const isClient = user?.role === 'CLIENT';
  const isProvider = user?.role === 'SERVICE_PROVIDER';

  const filters = [
    { value: '', label: t('appointments.filterAll') },
    { value: 'PENDING', label: t('appointments.filterPending') },
    { value: 'CONFIRMED', label: t('appointments.filterConfirmed') },
    { value: 'COMPLETED', label: t('appointments.filterCompleted') },
    { value: 'CANCELLED', label: t('appointments.filterCancelled') },
  ];

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    appointmentApi.getAll(params)
      .then((res) => setAppointments(res.data))
      .catch(() => Alert.alert(t('appointments.title'), t('appointments.loadFailed')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await appointmentApi.updateStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: status as AppointmentStatus } : a),
      );
    } catch {
      Alert.alert(t('appointments.title'), t('appointments.statusUpdateFailed'));
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      t('appointments.cancel'),
      t('appointments.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('appointments.cancel'),
          style: 'destructive',
          onPress: () => handleStatusChange(id, 'CANCELLED'),
        },
      ],
    );
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: '#f59e0b', CONFIRMED: '#10b981',
      COMPLETED: '#6b7280', CANCELLED: '#ef4444', RESCHEDULED: '#3b82f6',
    };
    return map[status] ?? '#9ca3af';
  };

  const apptAllServices = (a: Appointment) =>
    [a.service, ...(a.extraServices || [])].filter(Boolean) as { name: string; durationMin: number }[];

  const apptTotalPrice = (a: Appointment) =>
    (a.service?.price || 0) + (a.extraServices?.reduce((s, svc) => s + svc.price, 0) || 0);

  return (
    <View style={[styles.container, { direction: dir }]}>
      {/* Filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
        contentContainerStyle={[styles.filterContent, isRTL && styles.filterContentRtl]}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        {isClient && (
          <TouchableOpacity onPress={() => router.push('/book')} style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>＋ {t('appointments.bookNew')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.list}>
            {appointments.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t('appointments.noFound')}</Text>
                <Text style={styles.emptyDesc}>{t('appointments.noFoundDesc')}</Text>
                {isClient && (
                  <TouchableOpacity style={styles.bookEmptyBtn} onPress={() => router.push('/book')}>
                    <Text style={styles.bookEmptyText}>{t('appointments.bookNow')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : appointments.map((appt) => {
              const allSvcs = apptAllServices(appt);
              const totalPrice = apptTotalPrice(appt);
              const totalDur = Math.round(
                (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000,
              );
              return (
                <View key={appt.id} style={[styles.card, isRTL && styles.cardRtl]}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateMon}>{format(parseISO(appt.startTime), 'MMM').toUpperCase()}</Text>
                    <Text style={styles.dateDay}>{format(parseISO(appt.startTime), 'd')}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.serviceName, textAlignStyle]}>
                      {allSvcs.map((s) => s.name).join(' + ')}
                    </Text>
                    <Text style={[styles.meta, textAlignStyle]}>
                      {format(parseISO(appt.startTime), 'EEE, h:mm a')} · {totalDur}min
                    </Text>
                    {isClient && (
                      <Text style={[styles.meta, textAlignStyle]}>
                        {appt.provider?.providerProfile?.businessName || appt.provider?.name}
                      </Text>
                    )}
                    {isProvider && (
                      <Text style={[styles.meta, textAlignStyle]}>
                        {appt.client?.name} · ₪{totalPrice}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.right, isRTL && styles.rightRtl]}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(appt.status) + '22' }]}>
                      <Text style={[styles.statusText, { color: statusColor(appt.status) }]}>
                        {t(`status.${appt.status}`)}
                      </Text>
                    </View>
                    {/* Provider actions */}
                    {isProvider && appt.status === 'PENDING' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleStatusChange(appt.id, 'CONFIRMED')}
                        >
                          <Text style={styles.approveBtnText}>{t('appointments.confirm')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleCancel(appt.id)}
                        >
                          <Text style={styles.rejectBtnText}>{t('appointments.cancel')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {isProvider && appt.status === 'CONFIRMED' && (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleStatusChange(appt.id, 'COMPLETED')}
                      >
                        <Text style={styles.completeBtnText}>{t('appointments.complete')}</Text>
                      </TouchableOpacity>
                    )}
                    {/* Client actions */}
                    {isClient && ['PENDING', 'CONFIRMED'].includes(appt.status) && (
                      <TouchableOpacity onPress={() => handleCancel(appt.id)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>{t('appointments.cancel')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {isClient && (
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/book')}>
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexGrow: 0 },
  filterContent: { flexDirection: 'row', gap: 8, padding: 12, paddingHorizontal: 16 },
  filterContentRtl: { flexDirection: 'row-reverse' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterBtnActive: { backgroundColor: '#c026d3' },
  filterText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  filterTextActive: { color: '#fff' },
  bookBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fdf4ff', borderWidth: 1, borderColor: '#c026d3',
  },
  bookBtnText: { fontSize: 12, fontWeight: '600', color: '#a21caf' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 90 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  bookEmptyBtn: { marginTop: 16, backgroundColor: '#c026d3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  bookEmptyText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardRtl: { flexDirection: 'row-reverse' },
  dateBadge: {
    width: 50, height: 50, backgroundColor: '#fdf4ff',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  dateMon: { fontSize: 9, fontWeight: '700', color: '#a21caf' },
  dateDay: { fontSize: 20, fontWeight: '700', color: '#a21caf', lineHeight: 22 },
  info: { flex: 1 },
  serviceName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  rightRtl: { alignItems: 'flex-start' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'column', gap: 4 },
  approveBtn: {
    backgroundColor: '#d1fae5', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  approveBtnText: { color: '#059669', fontSize: 11, fontWeight: '600' },
  rejectBtn: {
    backgroundColor: '#fee2e2', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rejectBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '600' },
  completeBtn: {
    backgroundColor: '#fdf4ff', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#e9d5ff',
  },
  completeBtnText: { color: '#7c3aed', fontSize: 11, fontWeight: '600' },
  cancelBtn: { paddingVertical: 3 },
  cancelText: { fontSize: 11, color: '#ef4444', fontWeight: '500' },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#c026d3', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#c026d3', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '300' },
});

