import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, type TextStyle,
} from 'react-native';
import { format, parseISO, isAfter } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { appointmentApi } from '../services/api';
import type { Appointment } from '../types';

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  useEffect(() => {
    appointmentApi.getAll().then((res) => {
      setAppointments(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(
    (a) => ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status)
      && isAfter(parseISO(a.startTime), new Date()),
  );
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('client.greetingMorning');
    if (h < 18) return t('client.greetingAfternoon');
    return t('client.greetingEvening');
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: '#f59e0b',
      CONFIRMED: '#10b981',
      COMPLETED: '#6b7280',
      CANCELLED: '#ef4444',
      RESCHEDULED: '#3b82f6',
    };
    return map[status] ?? '#9ca3af';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c026d3" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { direction: dir }]} contentContainerStyle={styles.content}>
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={[styles.greeting, textAlignStyle]}>{greeting()},</Text>
        <Text style={[styles.userName, textAlignStyle]}>{user?.name} 👋</Text>
        <Text style={[styles.bannerSub, textAlignStyle]}>{t('client.welcomeSubtitle')}</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, isRTL && styles.statsRowRtl]}>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#c026d3' }]}>{upcoming.length}</Text>
          <Text style={styles.statLabel}>{t('client.upcoming')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#10b981' }]}>{completed}</Text>
          <Text style={styles.statLabel}>{t('client.completed')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#374151' }]}>{appointments.length}</Text>
          <Text style={styles.statLabel}>{t('client.totalBookings')}</Text>
        </View>
      </View>

      {/* Upcoming appointments */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>{t('client.upcomingAppointments')}</Text>
        {upcoming.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('client.noUpcoming')}</Text>
          </View>
        ) : (
          upcoming.slice(0, 5).map((appt) => (
            <View key={appt.id} style={[styles.apptRow, isRTL && styles.apptRowRtl]}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateMon}>{format(parseISO(appt.startTime), 'MMM').toUpperCase()}</Text>
                <Text style={styles.dateDay}>{format(parseISO(appt.startTime), 'd')}</Text>
              </View>
              <View style={styles.apptInfo}>
                <Text style={[styles.apptService, textAlignStyle]}>{appt.service?.name}</Text>
                <Text style={[styles.apptMeta, textAlignStyle]}>
                  {format(parseISO(appt.startTime), 'EEE, h:mm a')} · {appt.provider?.providerProfile?.businessName || appt.provider?.name}
                </Text>
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
  banner: {
    backgroundColor: '#c026d3',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  userName: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statsRowRtl: { flexDirection: 'row-reverse' },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNum: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
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
  dateBadge: {
    width: 44,
    height: 44,
    backgroundColor: '#fdf4ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMon: { fontSize: 9, fontWeight: '700', color: '#a21caf' },
  dateDay: { fontSize: 18, fontWeight: '700', color: '#a21caf', lineHeight: 20 },
  apptInfo: { flex: 1 },
  apptService: { fontSize: 13, fontWeight: '500', color: '#111827' },
  apptMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
