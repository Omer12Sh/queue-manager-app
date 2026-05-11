export type Role = 'ADMIN' | 'SERVICE_PROVIDER' | 'CLIENT';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'RESCHEDULED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  providerProfile?: ProviderProfile;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  address?: string;
  defaultLanguage: string;
  workingHours: Record<string, { open: string; close: string } | null>;
}

export interface Service {
  id: string;
  providerId: string;
  name: string;
  description?: string;
  durationMin: number;
  price: number;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  client?: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  provider?: Pick<User, 'id' | 'name'> & { providerProfile?: ProviderProfile };
  service?: Service;
}
