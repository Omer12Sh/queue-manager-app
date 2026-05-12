import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, type TextStyle,
} from 'react-native';
import { format, parseISO, isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { appointmentApi, serviceApi, aiApi } from '../services/api';
import type { Appointment, Service } from '../types';

export default function ProviderHomeScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiCommand, setAiCommand] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  const load = () => {
    Promise.allSettled([
      appointmentApi.getAll(),
      serviceApi.getByProvider(user!.id),
    ]).then(([apptRes, svcRes]) => {
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
      if (svcRes.status === 'fulfilled') setServices(svcRes.value.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [user]);

  const todayAppts = appointments.filter((a) => isToday(parseISO(a.startTime)));
  const pending = appointments.filter((a) => a.status === 'PENDING');

  const apptTotalPrice = (a: Appointment) =>
    (a.service?.price || 0) + (a.extraServices?.reduce((s, svc) => s + svc.price, 0) || 0);

  const dailyExpected = todayAppts
    .filter((a) => ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(a.status))
    .reduce((sum, a) => sum + apptTotalPrice(a), 0);

  const allTimeEarned = appointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + apptTotalPrice(a), 0);

  const apptAllServices = (a: Appointment) =>
    [a.service, ...(a.extraServices || [])].filter(Boolean) as { name: string; durationMin: number }[];

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: '#f59e0b', CONFIRMED: '#10b981',
      COMPLETED: '#6b7280', CANCELLED: '#ef4444', RESCHEDULED: '#3b82f6',
    };
    return map[status] ?? '#9ca3af';
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await appointmentApi.updateStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: status as Appointment['status'] } : a),
      );
    } catch {
      Alert.alert(t('appointments.title'), t('appointments.statusUpdateFailed'));
    }
  };

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiApi.command(aiCommand);
      setAiResponse(res.data.message);
    } catch {
      setAiResponse(t('provider.aiUnavailable'));
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>;
  }

  return (
    <ScrollView style={[styles.container, { direction: dir }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, textAlignStyle]}>{t('provider.welcomeBack', { name: user?.name })}</Text>
      <Text style={[styles.subtitle, textAlignStyle]}>{t('provider.overviewSubtitle')}</Text>

      {/* Stats row 1 */}
      <View style={[styles.grid, isRTL && styles.gridRtl]}>
        {[
          { label: t('provider.todayAppointments'), value: todayAppts.length, color: '#c026d3' },
          { label: t('provider.pendingConfirmations'), value: pending.length, color: '#f59e0b' },
          { label: t('provider.activeServices'), value: services.length, color: '#3b82f6' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statNum, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Revenue row */}
      <View style={[styles.revenueRow, isRTL && styles.gridRtl]}>
        <View style={[styles.revenueCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.revenueLabel}>{t('provider.dailyExpected')}</Text>
          <Text style={[styles.revenueNum, { color: '#10b981' }]}>₪{dailyExpected.toLocaleString()}</Text>
        </View>
        <View style={[styles.revenueCard, { borderLeftColor: '#c026d3' }]}>
          <Text style={styles.revenueLabel}>{t('provider.allTimeEarned')}</Text>
          <Text style={[styles.revenueNum, { color: '#c026d3' }]}>₪{allTimeEarned.toLocaleString()}</Text>
        </View>
      </View>

      {/* Today's schedule */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>{t('provider.todaySchedule')}</Text>
        {todayAppts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('provider.noTodayAppointments')}</Text>
          </View>
        ) : (
          todayAppts.map((appt) => {
            const allSvcs = apptAllServices(appt);
            const totalDur = Math.round(
              (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000,
            );
            return (
              <View key={appt.id} style={[styles.apptRow, isRTL && styles.apptRowRtl]}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{format(parseISO(appt.startTime), 'h:mm')}</Text>
                  <Text style={styles.ampm}>{format(parseISO(appt.startTime), 'a')}</Text>
                </View>
                <View style={styles.apptInfo}>
                  <Text style={[styles.clientName, textAlignStyle]}>{appt.client?.name}</Text>
                  <Text style={[styles.serviceName, textAlignStyle]}>
                    {allSvcs.map((s) => s.name).join(' + ')} · {totalDur}min
                  </Text>
                </View>
                <View style={[styles.actionCol, isRTL && styles.actionColRtl]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(appt.status) }]} />
                  {appt.status === 'PENDING' && (
                    <View style={[styles.btnRow, isRTL && styles.btnRowRtl]}>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleStatusChange(appt.id, 'CONFIRMED')}
                      >
                        <Text style={styles.approveBtnText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleStatusChange(appt.id, 'CANCELLED')}
                      >
                        <Text style={styles.rejectBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {appt.status === 'CONFIRMED' && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleStatusChange(appt.id, 'COMPLETED')}
                    >
                      <Text style={styles.completeBtnText}>{t('appointments.complete')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* AI Assistant */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>
          🤖 {t('provider.aiAssistant')}
          {'  '}<Text style={styles.betaBadge}>{t('provider.aiBeta')}</Text>
        </Text>
        <Text style={[styles.aiDesc, textAlignStyle]}>{t('provider.aiDescription')}</Text>
        <View style={styles.aiInputRow}>
          <TextInput
            style={[styles.aiInput, textAlignStyle]}
            value={aiCommand}
            onChangeText={setAiCommand}
            placeholder={t('provider.aiPlaceholder')}
            multiline
            numberOfLines={2}
          />
        </View>
        <TouchableOpacity
          style={[styles.aiSendBtn, (!aiCommand.trim() || aiLoading) && styles.aiSendBtnDisabled]}
          onPress={handleAiCommand}
          disabled={!aiCommand.trim() || aiLoading}
        >
          <Text style={styles.aiSendBtnText}>
            {aiLoading ? t('provider.aiProcessing') : t('provider.aiSendCommand')}
          </Text>
        </TouchableOpacity>
        {aiResponse !== '' && (
          <View style={styles.aiResponse}>
            <Text style={[styles.aiResponseText, textAlignStyle]}>{aiResponse}</Text>
          </View>
        )}
        <Text style={[styles.quickLabel, textAlignStyle]}>{t('provider.quickCommands')}</Text>
        <View style={[styles.quickRow, isRTL && styles.quickRowRtl]}>
          {[t('provider.quickCmd1'), t('provider.quickCmd2'), t('provider.quickCmd3')].map((cmd) => (
            <TouchableOpacity key={cmd} onPress={() => setAiCommand(cmd)} style={styles.quickBtn}>
              <Text style={styles.quickBtnText}>{cmd}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  grid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  gridRtl: { flexDirection: 'row-reverse' },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  revenueRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  revenueCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  revenueNum: { fontSize: 20, fontWeight: '700' },
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
  empty: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 13 },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  apptRowRtl: { flexDirection: 'row-reverse' },
  timeBox: { width: 46, alignItems: 'center' },
  timeText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  ampm: { fontSize: 10, color: '#9ca3af' },
  apptInfo: { flex: 1 },
  clientName: { fontSize: 13, fontWeight: '500', color: '#111827' },
  serviceName: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  actionCol: { alignItems: 'flex-end', gap: 4 },
  actionColRtl: { alignItems: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', gap: 4 },
  btnRowRtl: { flexDirection: 'row-reverse' },
  approveBtn: {
    backgroundColor: '#d1fae5', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  approveBtnText: { color: '#059669', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    backgroundColor: '#fee2e2', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  rejectBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  completeBtn: {
    backgroundColor: '#fdf4ff', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#e9d5ff',
  },
  completeBtnText: { color: '#7c3aed', fontSize: 11, fontWeight: '600' },
  // AI
  aiDesc: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  betaBadge: { fontSize: 10, backgroundColor: '#f3e8ff', color: '#7c3aed', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  aiInputRow: { marginBottom: 8 },
  aiInput: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 12, padding: 10, fontSize: 13, color: '#111827',
    minHeight: 56, textAlignVertical: 'top',
  },
  aiSendBtn: {
    backgroundColor: '#c026d3', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', marginBottom: 10,
  },
  aiSendBtnDisabled: { opacity: 0.5 },
  aiSendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  aiResponse: {
    backgroundColor: '#f5f3ff', borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#ede9fe',
  },
  aiResponseText: { color: '#4c1d95', fontSize: 13, lineHeight: 20 },
  quickLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickRowRtl: { flexDirection: 'row-reverse' },
  quickBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  quickBtnText: { fontSize: 11, color: '#374151' },
});

