import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import ClientHomeScreen from '../../src/screens/ClientHomeScreen';
import ProviderHomeScreen from '../../src/screens/ProviderHomeScreen';

export default function DashboardTab() {
  const { user } = useAuth();
  if (user?.role === 'SERVICE_PROVIDER' || user?.role === 'ADMIN') {
    return <ProviderHomeScreen />;
  }
  return <ClientHomeScreen />;
}
