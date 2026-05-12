import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentApi, serviceApi, aiApi } from '../../services/api';
import type { Appointment, Service } from '../../types';
import {
  Calendar, Users, DollarSign, Clock, Send, Sparkles, Bot, CheckCircle, XCircle, TrendingUp,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, parseISO, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [aiCommand, setAiCommand] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const load = async () => {
    const [apptRes, svcRes] = await Promise.allSettled([
      appointmentApi.getAll(),
      serviceApi.getByProvider(user!.id),
    ]);
    if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
    if (svcRes.status === 'fulfilled') setServices(svcRes.value.data);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const todayAppts = appointments.filter((a) => isToday(parseISO(a.startTime)));
  const pending = appointments.filter((a) => a.status === 'PENDING');

  // Daily expected: sum of today's PENDING + CONFIRMED + COMPLETED appointment prices
  const dailyExpected = todayAppts
    .filter((a) => ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(a.status))
    .reduce((sum, a) => sum + (a.service?.price || 0), 0);

  // All-time earned: all COMPLETED appointments ever
  const allTimeEarned = appointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.service?.price || 0), 0);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await appointmentApi.updateStatus(id, status);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status as Appointment['status'] } : a))
      );
      toast.success(t('appointments.statusUpdated'));
    } catch {
      toast.error(t('appointments.statusUpdateFailed'));
    }
  };

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiApi.command(aiCommand);
      setAiResponse(res.data.message);
      toast.success(t('provider.aiProcessed'));
    } catch {
      setAiResponse(t('provider.aiUnavailable'));
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const quickCmds = [t('provider.quickCmd1'), t('provider.quickCmd2'), t('provider.quickCmd3')];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('provider.welcomeBack', { name: user?.name })}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('provider.overviewSubtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('provider.todayAppointments')} value={todayAppts.length} icon={<Calendar size={20} />} color="brand" />
        <StatCard label={t('provider.pendingConfirmations')} value={pending.length} icon={<Clock size={20} />} color="yellow" />
        <StatCard label={t('provider.activeServices')} value={services.length} icon={<Sparkles size={20} />} color="blue" />
        <StatCard label={t('provider.dailyExpected')} value={`₪${dailyExpected.toLocaleString()}`} icon={<DollarSign size={20} />} color="green" />
      </div>

      {/* Revenue counters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <DollarSign size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('provider.dailyExpected')}</p>
            <p className="text-2xl font-bold text-green-700">₪{dailyExpected.toLocaleString()}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
            <TrendingUp size={22} className="text-brand-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('provider.allTimeEarned')}</p>
            <p className="text-2xl font-bold text-brand-700">₪{allTimeEarned.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-brand-600" />
              <h2 className="font-semibold text-gray-900">{t('provider.todaySchedule')}</h2>
            </div>
            <span className="badge bg-brand-100 text-brand-700">{todayAppts.length} {t('provider.appointments')}</span>
          </div>

          {todayAppts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">{t('provider.noTodayAppointments')}</p>
          ) : (
            <div className="space-y-3">
              {todayAppts.map((appt) => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                  <div className="w-16 text-center">
                    <p className="text-xs font-bold text-gray-700">{format(parseISO(appt.startTime), 'h:mm')}</p>
                    <p className="text-xs text-gray-400">{format(parseISO(appt.startTime), 'a')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{appt.client?.name}</p>
                    <p className="text-gray-500 text-xs">{appt.service?.name} · {appt.service?.durationMin}min</p>
                  </div>
                  <StatusBadge status={appt.status} />
                  {appt.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStatusChange(appt.id, 'CONFIRMED')}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        title={t('appointments.confirm')}
                      >
                        <CheckCircle size={15} />
                      </button>
                      <button
                        onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title={t('appointments.cancel')}
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  )}
                  {appt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                      className="text-xs px-2 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                    >
                      {t('appointments.complete')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">{t('provider.aiAssistant')}</h2>
            <span className="badge bg-purple-100 text-purple-700 ml-auto">{t('provider.aiBeta')}</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">{t('provider.aiDescription')}</p>
          <div className="space-y-3">
            <textarea
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              placeholder={t('provider.aiPlaceholder')}
              className="input resize-none h-24 text-sm"
            />
            <button
              onClick={handleAiCommand}
              disabled={aiLoading || !aiCommand.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {aiLoading ? t('provider.aiProcessing') : t('provider.aiSendCommand')}
            </button>
            {aiResponse && (
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800 border border-purple-100">
                <Bot size={14} className="inline mr-1" />
                {aiResponse}
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">{t('provider.quickCommands')}</p>
            <div className="flex flex-wrap gap-2">
              {quickCmds.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setAiCommand(cmd)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent appointments */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">{t('provider.recentAppointments')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">{t('provider.colClient')}</th>
                <th className="pb-3 font-medium">{t('provider.colService')}</th>
                <th className="pb-3 font-medium">{t('provider.colDateTime')}</th>
                <th className="pb-3 font-medium">{t('provider.colPrice')}</th>
                <th className="pb-3 font-medium">{t('provider.colStatus')}</th>
                <th className="pb-3 font-medium">{t('provider.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.slice(0, 10).map((appt) => (
                <tr key={appt.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{appt.client?.name}</td>
                  <td className="py-3 text-gray-600">{appt.service?.name}</td>
                  <td className="py-3 text-gray-600">{format(parseISO(appt.startTime), 'MMM d, h:mm a')}</td>
                  <td className="py-3 text-gray-600">₪{appt.service?.price}</td>
                  <td className="py-3"><StatusBadge status={appt.status} /></td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {appt.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(appt.id, 'CONFIRMED')}
                            className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            {t('appointments.confirm')}
                          </button>
                          <button
                            onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            {t('appointments.cancel')}
                          </button>
                        </>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                          className="text-xs px-2 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                        >
                          {t('appointments.complete')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {appointments.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">{t('provider.noAppointments')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
