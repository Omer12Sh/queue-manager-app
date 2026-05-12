import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, type TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { serviceApi } from '../../src/services/api';
import type { Service } from '../../src/types';

export default function ServicesTab() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const textAlignStyle: TextStyle = { textAlign: isRTL ? 'right' : 'left', writingDirection: dir };

  useEffect(() => {
    if (user) {
      serviceApi.getByProvider(user.id)
        .then((res) => setServices(res.data))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#c026d3" /></View>;
  }

  return (
    <ScrollView style={[styles.container, { direction: dir }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, textAlignStyle]}>{t('services.title')}</Text>
      <Text style={[styles.subtitle, textAlignStyle]}>{t('services.subtitle')}</Text>
      {services.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('services.noServices')}</Text>
          <Text style={styles.emptyDesc}>{t('services.noServicesDesc')}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {services.map((svc) => (
            <View key={svc.id} style={styles.card}>
              <Text style={styles.sparkle}>✨</Text>
              <Text style={[styles.svcName, textAlignStyle]}>{svc.name}</Text>
              {svc.description && <Text style={[styles.svcDesc, textAlignStyle]} numberOfLines={2}>{svc.description}</Text>}
              <View style={[styles.row, isRTL && styles.rowRtl]}>
                <Text style={styles.svcDuration}>⏱ {svc.durationMin} {t('services.min')}</Text>
                <Text style={styles.svcPrice}>₪{svc.price}</Text>
              </View>
              <View style={[styles.badge, svc.isActive ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, svc.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {svc.isActive ? t('services.active') : t('services.inactive')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptyDesc: { fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  grid: { gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sparkle: { fontSize: 20, marginBottom: 6 },
  svcName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  svcDesc: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  svcDuration: { fontSize: 12, color: '#6b7280' },
  svcPrice: { fontSize: 14, fontWeight: '700', color: '#a21caf' },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActive: { backgroundColor: '#d1fae5' },
  badgeInactive: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextActive: { color: '#059669' },
  badgeTextInactive: { color: '#9ca3af' },
});
