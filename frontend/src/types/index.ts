export type Role = 'ADMIN' | 'SERVICE_PROVIDER' | 'CLIENT';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'RESCHEDULED';
export type MessageType = 'SMS' | 'WHATSAPP' | 'IN_APP';

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
  avatarUrl?: string;
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
  extraServiceIds: string[];
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  client?: Pick<User, 'id' | 'name' | 'email' | 'phone'>;
  provider?: Pick<User, 'id' | 'name'> & { providerProfile?: ProviderProfile };
  service?: Service;
  extraServices?: Service[];
}

export interface Message {
  id: string;
  fromId: string;
  toId?: string;
  content: string;
  type: MessageType;
  isRead: boolean;
  sentAt: string;
  from?: Pick<User, 'id' | 'name'>;
  to?: Pick<User, 'id' | 'name'>;
}

export interface Announcement {
  id: string;
  providerId: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalAppointments: number;
  activeProviders: number;
  pendingAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface AvailabilityOverride {
  id: string;
  providerId: string;
  date: string;
  isOff: boolean;
  slots: string[];
}
