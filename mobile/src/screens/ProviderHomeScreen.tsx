import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, type TextStyle,
} from 'react-native';
import { format, parseISO, isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { appointmentApi, serviceApi } from '../services/api';
import type { Appointment, Service } from '../types';

export default function ProviderHomeScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  useEffect(() => {
    Promise.allSettled([
      appointmentApi.getAll(),
      serviceApi.getByProvider(user!.id),
    ]).then(([apptRes, svcRes]) => {
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
      if (svcRes.status === 'fulfilled') setServices(svcRes.value.data);
      setLoading(false);
    });
  }, [user]);

  const todayAppts = appointments.filter((a) => isToday(parseISO(a.startTime)));
  const pending = appointments.filter((a) => a.status === 'PENDING');
  const totalRevenue = appointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.service?.price || 0), 0);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: '#f59e0b', CONFIRMED: '#10b981',
      COMPLETED: '#6b7280', CANCELLED: '#ef4444', RESCHEDULED: '#3b82f6',
    };
    return map[status] ?? '#9ca3af';
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>;
  }

  return (
    <ScrollView style={[styles.container, { direction: dir }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, textAlignStyle]}>{t('provider.welcomeBack', { name: user?.name })}</Text>
      <Text style={[styles.subtitle, textAlignStyle]}>{t('provider.overviewSubtitle')}</Text>

      {/* Stats */}
      <View style={[styles.grid, isRTL && styles.gridRtl]}>
        {[
          { label: t('provider.todayAppointments'), value: todayAppts.length, color: '#c026d3' },
          { label: t('provider.pendingConfirmations'), value: pending.length, color: '#f59e0b' },
          { label: t('provider.activeServices'), value: services.length, color: '#3b82f6' },
          { label: t('provider.totalRevenue'), value: `₪${totalRevenue.toLocaleString()}`, color: '#10b981' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Today's schedule */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>{t('provider.todaySchedule')}</Text>
        {todayAppts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('provider.noTodayAppointments')}</Text>
          </View>
        ) : (
          todayAppts.map((appt) => (
            <View key={appt.id} style={[styles.apptRow, isRTL && styles.apptRowRtl]}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{format(parseISO(appt.startTime), 'h:mm')}</Text>
                <Text style={styles.ampm}>{format(parseISO(appt.startTime), 'a')}</Text>
              </View>
              <View style={styles.apptInfo}>
                <Text style={[styles.clientName, textAlignStyle]}>{appt.client?.name}</Text>
                <Text style={[styles.serviceName, textAlignStyle]}>{appt.service?.name} · {appt.service?.durationMin}min</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: statusColor(appt.status) }]} />
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridRtl: { flexDirection: 'row-reverse' },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 13 },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  apptRowRtl: { flexDirection: 'row-reverse' },
  timeBox: {
    width: 50,
    alignItems: 'center',
  },
  timeText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  ampm: { fontSize: 10, color: '#9ca3af' },
  apptInfo: { flex: 1 },
  clientName: { fontSize: 13, fontWeight: '500', color: '#111827' },
  serviceName: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
