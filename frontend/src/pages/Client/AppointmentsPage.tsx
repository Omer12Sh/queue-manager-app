import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentApi } from '../../services/api';
import type { Appointment, AppointmentStatus } from '../../types';
import { PlusCircle, Filter } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const STATUS_FILTERS = [
    { value: '', label: t('appointments.filterAll') },
    { value: 'PENDING', label: t('appointments.filterPending') },
    { value: 'CONFIRMED', label: t('appointments.filterConfirmed') },
    { value: 'COMPLETED', label: t('appointments.filterCompleted') },
    { value: 'CANCELLED', label: t('appointments.filterCancelled') },
    { value: 'RESCHEDULED', label: t('appointments.filterRescheduled') },
  ];

  const load = async () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    const res = await appointmentApi.getAll(params);
    setAppointments(res.data);
    setIsLoading(false);
  };

  useEffect(() => { setIsLoading(true); load(); }, [filter]);

  const handleCancel = async (id: string) => {
    if (!confirm(t('appointments.cancelConfirm'))) return;
    try {
      await appointmentApi.updateStatus(id, 'CANCELLED');
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' as AppointmentStatus } : a)));
      toast.success(t('appointments.cancelSuccess'));
    } catch { toast.error(t('appointments.cancelFailed')); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('appointments.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('appointments.subtitle')}</p>
        </div>
          {user?.role === 'CLIENT' && (
            <Link to="/appointments/book" className="btn-primary flex items-center gap-2">
              <PlusCircle size={16} /> {t('appointments.bookNew')}
            </Link>
          )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={16} className="text-gray-400 flex-shrink-0" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.value ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          title={t('appointments.noFound')}
          description={t('appointments.noFoundDesc')}
          action={user?.role === 'CLIENT' ? <Link to="/appointments/book" className="btn-primary">{t('appointments.bookNow')}</Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="card flex items-center gap-4 flex-wrap">
              <div className="w-14 h-14 bg-brand-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand-700">{format(parseISO(appt.startTime), 'MMM').toUpperCase()}</span>
                <span className="text-2xl font-bold text-brand-700 leading-tight">{format(parseISO(appt.startTime), 'd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{appt.service?.name}</p>
                <p className="text-gray-500 text-sm">{format(parseISO(appt.startTime), 'EEEE, h:mm a')} · {appt.service?.durationMin}min</p>
                <p className="text-gray-400 text-xs mt-0.5">{appt.provider?.providerProfile?.businessName || appt.provider?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={appt.status} />
                {['PENDING', 'CONFIRMED'].includes(appt.status) && (
                  <button onClick={() => handleCancel(appt.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    {t('appointments.cancel')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

