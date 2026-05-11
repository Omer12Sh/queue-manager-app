import { useEffect, useState } from 'react';
import { adminApi, userApi } from '../../services/api';
import type { AdminStats, User } from '../../types';
import { Users, Calendar, TrendingUp, Clock, CheckCircle, Layers } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<'overview' | 'users'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      const [statsRes, usersRes] = await Promise.allSettled([
        adminApi.getStats(),
        userApi.getAll(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleToggleUser = async (user: User) => {
    try {
      await adminApi.manageUser(user.id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      toast.success(user.isActive ? t('admin.userDeactivated') : t('admin.userActivated'));
    } catch {
      toast.error(t('admin.toggleFailed'));
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    SERVICE_PROVIDER: 'bg-brand-100 text-brand-700',
    CLIENT: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('admin.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={t('admin.totalUsers')} value={stats?.totalUsers ?? 0} icon={<Users size={20} />} color="brand" />
        <StatCard label={t('admin.totalAppointments')} value={stats?.totalAppointments ?? 0} icon={<Calendar size={20} />} color="blue" />
        <StatCard label={t('admin.activeProviders')} value={stats?.activeProviders ?? 0} icon={<Layers size={20} />} color="green" />
        <StatCard label={t('admin.pendingToday')} value={stats?.pendingAppointments ?? 0} icon={<Clock size={20} />} color="yellow" />
        <StatCard label={t('admin.todayAppointments')} value={stats?.todayAppointments ?? 0} icon={<CheckCircle size={20} />} color="blue" />
        <StatCard label={t('admin.totalRevenue')} value={`₪${(stats?.totalRevenue ?? 0).toLocaleString()}`} icon={<TrendingUp size={20} />} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'users'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === tabKey ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tabKey === 'overview' ? t('admin.tabOverview') : t('admin.tabUsers')}
          </button>
        ))}
      </div>

      {/* Users table */}
      {tab === 'users' && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">{t('admin.allUsers', { count: users.length })}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">{t('admin.colName')}</th>
                  <th className="pb-3 font-medium">{t('admin.colEmail')}</th>
                  <th className="pb-3 font-medium">{t('admin.colRole')}</th>
                  <th className="pb-3 font-medium">{t('admin.colJoined')}</th>
                  <th className="pb-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="pb-3 font-medium">{t('admin.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="py-3 text-gray-600">{u.email}</td>
                    <td className="py-3">
                      <span className={`badge ${roleColors[u.role]}`}>{t(`roles.${u.role}`)}</span>
                    </td>
                    <td className="py-3 text-gray-500">{format(parseISO(u.createdAt), 'MMM d, yyyy')}</td>
                    <td className="py-3">
                      <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? t('admin.statusActive') : t('admin.statusInactive')}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggleUser(u)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                          u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {u.isActive ? t('admin.deactivate') : t('admin.activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">{t('admin.systemStatus')}</h2>
            <div className="space-y-3">
              {[
                { label: 'API Server', status: 'Online', color: 'text-green-600' },
                { label: 'Database (PostgreSQL)', status: 'Connected', color: 'text-green-600' },
                { label: 'Redis Cache', status: 'Optional', color: 'text-yellow-600' },
                { label: 'AI Assistant', status: 'Configure OPENAI_API_KEY', color: 'text-yellow-600' },
                { label: 'SMS / WhatsApp', status: 'Configure Twilio', color: 'text-yellow-600' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">{t('admin.userDistribution')}</h2>
            {[
              { role: t('admin.clients'), count: users.filter((u) => u.role === 'CLIENT').length, color: 'bg-green-200' },
              { role: t('admin.serviceProviders'), count: users.filter((u) => u.role === 'SERVICE_PROVIDER').length, color: 'bg-brand-200' },
              { role: t('admin.admins'), count: users.filter((u) => u.role === 'ADMIN').length, color: 'bg-red-200' },
            ].map((item) => (
              <div key={item.role} className="flex items-center gap-3 py-2">
                <div className={`h-3 rounded-full ${item.color}`} style={{ width: `${Math.max(8, (item.count / users.length) * 100 || 8)}%`, minWidth: 32 }} />
                <span className="text-sm text-gray-600">{item.role}</span>
                <span className="ml-auto text-sm font-semibold text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

