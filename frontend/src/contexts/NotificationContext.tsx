import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

export interface AppNotification {
  id: string;
  type: 'appointment:new' | 'appointment:updated' | 'appointment:rescheduled' | 'message:new' | 'broadcast:message' | 'user:new';
  title: string;
  body: string;
  createdAt: Date;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function makeId() {
  return Math.random().toString(36).slice(2);
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const push = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const notification: AppNotification = { ...n, id: makeId(), createdAt: new Date(), isRead: false };
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    toast(n.body, { icon: '🔔', duration: 4000 });
  }, []);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(BASE_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    // ---- Events relevant to ALL roles ----
    socket.on('appointment:updated', (appt) => {
      push({
        type: 'appointment:updated',
        title: 'Appointment Updated',
        body: `Appointment for ${appt.service?.name ?? 'service'} is now ${appt.status}.`,
      });
    });

    socket.on('appointment:rescheduled', (appt) => {
      push({
        type: 'appointment:rescheduled',
        title: 'Appointment Rescheduled',
        body: `Your appointment for ${appt.service?.name ?? 'service'} has been rescheduled.`,
      });
    });

    // ---- Events relevant to CLIENTS ----
    if (user.role === 'CLIENT') {
      socket.on('message:new', (msg) => {
        push({
          type: 'message:new',
          title: `New message from ${msg.from?.name ?? 'provider'}`,
          body: msg.content,
        });
      });

      socket.on('broadcast:message', (msg) => {
        push({
          type: 'broadcast:message',
          title: 'Announcement',
          body: msg.content,
        });
      });
    }

    // ---- Events relevant to SERVICE_PROVIDER ----
    if (user.role === 'SERVICE_PROVIDER') {
      socket.on('appointment:new', (appt) => {
        push({
          type: 'appointment:new',
          title: 'New Appointment Request',
          body: `${appt.client?.name ?? 'A client'} booked ${appt.service?.name ?? 'a service'}.`,
        });
      });

      socket.on('user:new', (u) => {
        if (u.role === 'CLIENT') {
          push({
            type: 'user:new',
            title: 'New Client Registered',
            body: `${u.name} just signed up.`,
          });
        }
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  const markRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
};
