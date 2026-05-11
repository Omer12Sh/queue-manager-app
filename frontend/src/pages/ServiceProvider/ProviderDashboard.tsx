import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentApi, serviceApi, aiApi } from '../../services/api';
import type { Appointment, Service } from '../../types';
import {
  Calendar, Users, DollarSign, Clock, Send, Sparkles, Bot,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, parseISO, isToday } from 'date-fns';
import toast from 'react-hot-toast';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [aiCommand, setAiCommand] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [apptRes, svcRes] = await Promise.allSettled([
        appointmentApi.getAll(),
        serviceApi.getByProvider(user!.id),
      ]);
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
      if (svcRes.status === 'fulfilled') setServices(svcRes.value.data);
      setIsLoading(false);
    };
    load();
  }, [user]);

  const todayAppts = appointments.filter((a) => isToday(parseISO(a.startTime)));
  const pending = appointments.filter((a) => a.status === 'PENDING');
  const totalRevenue = appointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.service?.price || 0), 0);

  const handleAiCommand = async () => {
    if (!aiCommand.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiApi.command(aiCommand);
      setAiResponse(res.data.message);
      toast.success('AI command processed');
    } catch {
      setAiResponse('AI assistant unavailable. Please configure OPENAI_API_KEY in backend .env');
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your business overview for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Appointments" value={todayAppts.length} icon={<Calendar size={20} />} color="brand" />
        <StatCard label="Pending Confirmations" value={pending.length} icon={<Clock size={20} />} color="yellow" />
        <StatCard label="Active Services" value={services.length} icon={<Sparkles size={20} />} color="blue" />
        <StatCard label="Total Revenue" value={`₪${totalRevenue.toLocaleString()}`} icon={<DollarSign size={20} />} color="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-brand-600" />
              <h2 className="font-semibold text-gray-900">Today's Schedule</h2>
            </div>
            <span className="badge bg-brand-100 text-brand-700">{todayAppts.length} appointments</span>
          </div>

          {todayAppts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No appointments scheduled for today 🎉</p>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <span className="badge bg-purple-100 text-purple-700 ml-auto">Beta</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Give natural language commands to manage your schedule. Requires OPENAI_API_KEY.
          </p>
          <div className="space-y-3">
            <textarea
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              placeholder={'e.g. "Delay all today\'s appointments by 30 minutes" or "What\'s on my schedule today?"'}
              className="input resize-none h-24 text-sm"
            />
            <button
              onClick={handleAiCommand}
              disabled={aiLoading || !aiCommand.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {aiLoading ? 'Processing…' : 'Send command'}
            </button>
            {aiResponse && (
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800 border border-purple-100">
                <Bot size={14} className="inline mr-1" />
                {aiResponse}
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Quick commands:</p>
            <div className="flex flex-wrap gap-2">
              {["What's today's schedule?", 'Delay appointments by 30 min', 'Cancel all pending appointments'].map((cmd) => (
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
          <h2 className="font-semibold text-gray-900">Recent Appointments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Service</th>
                <th className="pb-3 font-medium">Date & Time</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">Status</th>
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
                </tr>
              ))}
            </tbody>
          </table>
          {appointments.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No appointments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
