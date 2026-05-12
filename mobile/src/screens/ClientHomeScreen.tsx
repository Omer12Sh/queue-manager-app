import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, type TextStyle,
} from 'react-native';
import { format, parseISO, isAfter } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { appointmentApi, userApi, providerApi } from '../services/api';
import type { Announcement, Appointment } from '../types';

export default function ClientHomeScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left' };
  const router = useRouter();

  useEffect(() => {
    Promise.allSettled([
      appointmentApi.getAll(),
      userApi.getAll(),
    ]).then(async ([apptRes, providersRes]) => {
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
      if (providersRes.status === 'fulfilled') {
        const providers: { id: string }[] = providersRes.value.data;
        const annResults = await Promise.allSettled(
          providers.map((p) => providerApi.getAnnouncements(p.id)),
        );
        const allAnns = annResults.flatMap((r) =>
          r.status === 'fulfilled' ? (r.value.data as Announcement[]) : [],
        );
        setAnnouncements(allAnns);
      }
      setLoading(false);
    });
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
    <View style={styles.wrapper}>
      <ScrollView style={[styles.container, { direction: dir }]} contentContainerStyle={styles.content}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={[styles.greeting, textAlignStyle]}>{greeting()},</Text>
          <Text style={[styles.userName, textAlignStyle]}>{user?.name} 👋</Text>
          <Text style={[styles.bannerSub, textAlignStyle]}>{t('client.welcomeSubtitle')}</Text>

          {/* Book button inside banner */}
          <TouchableOpacity style={styles.bookBannerBtn} onPress={() => router.push('/book')}>
            <Text style={styles.bookBannerText}>✨ {t('client.bookAppointment')}</Text>
          </TouchableOpacity>
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

        {/* Announcements from provider */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, textAlignStyle]}>📢 {t('client.updatesFromProvider')}</Text>
            {announcements.slice(0, 3).map((ann) => (
              <View key={ann.id} style={styles.annCard}>
                <Text style={[styles.annTitle, textAlignStyle]}>{ann.title}</Text>
                <Text style={[styles.annContent, textAlignStyle]}>{ann.content}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming appointments */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, textAlignStyle]}>{t('client.upcomingAppointments')}</Text>
          {upcoming.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('client.noUpcoming')}</Text>
              <TouchableOpacity onPress={() => router.push('/book')} style={styles.bookEmptyBtn}>
                <Text style={styles.bookEmptyText}>{t('client.bookFirst')}</Text>
              </TouchableOpacity>
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

      {/* Floating action button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/book')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: '#c026d3',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  userName: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, marginBottom: 16 },
  bookBannerBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  bookBannerText: { color: '#a21caf', fontWeight: '700', fontSize: 14 },
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
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  annCard: {
    backgroundColor: '#fdf4ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#c026d3',
  },
  annTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  annContent: { fontSize: 12, color: '#374151', lineHeight: 18 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 13 },
  bookEmptyBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fdf4ff', borderRadius: 10 },
  bookEmptyText: { color: '#a21caf', fontSize: 13, fontWeight: '600' },
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
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#c026d3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c026d3',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '300' },
});
