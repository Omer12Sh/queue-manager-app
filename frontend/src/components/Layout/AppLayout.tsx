import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Calendar, Settings, MessageSquare, LogOut,
  Users, Sparkles, Bell, ChevronRight, CheckCheck,
} from 'lucide-react';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { format } from 'date-fns';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: string[];
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems: NavItem[] = [
    { label: t('nav.dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'SERVICE_PROVIDER', 'CLIENT'] },
    { label: t('nav.appointments'), path: '/appointments', icon: <Calendar size={20} />, roles: ['ADMIN', 'SERVICE_PROVIDER', 'CLIENT'] },
    { label: t('nav.services'), path: '/services', icon: <Sparkles size={20} />, roles: ['SERVICE_PROVIDER', 'ADMIN'] },
    { label: t('nav.messages'), path: '/messages', icon: <MessageSquare size={20} />, roles: ['SERVICE_PROVIDER', 'ADMIN'] },
    { label: t('nav.users'), path: '/users', icon: <Users size={20} />, roles: ['ADMIN'] },
    { label: t('nav.settings'), path: '/settings', icon: <Settings size={20} />, roles: ['SERVICE_PROVIDER', 'ADMIN'] },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    SERVICE_PROVIDER: 'bg-brand-100 text-brand-700',
    CLIENT: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col rtl:border-r-0 rtl:border-l">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-brand-700">{t('app.name')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('app.tagline')}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
                {isActive && <ChevronRight size={14} className="ltr:ml-auto rtl:mr-auto rtl:rotate-180" />}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 font-semibold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <span className={`badge text-xs ${user ? roleColors[user.role] : ''}`}>
                {user ? t(`roles.${user.role}`) : ''}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title={t('nav.logout')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-900 text-sm">{t('notifications.title')}</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        <CheckCheck size={13} />
                        {t('notifications.markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">{t('notifications.empty')}</p>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {notifications.map((n) => (
                          <li
                            key={n.id}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-brand-50' : ''}`}
                            onClick={() => markRead(n.id)}
                          >
                            <div className="flex items-start gap-2">
                              {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                              <div className={!n.isRead ? '' : 'ml-4'}>
                                <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{format(n.createdAt, 'MMM d, h:mm a')}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 font-semibold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

