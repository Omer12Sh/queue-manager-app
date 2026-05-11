import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentApi } from '../../services/api';
import type { Appointment, Announcement } from '../../types';
import { Calendar, Clock, History, PlusCircle, Megaphone, Star } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, parseISO, isAfter } from 'date-fns';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [announcements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [apptRes] = await Promise.allSettled([appointmentApi.getAll()]);
      if (apptRes.status === 'fulfilled') setAppointments(apptRes.value.data);
      setIsLoading(false);
    };
    load();
  }, []);

  const upcoming = appointments.filter(
    (a) => ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status) && isAfter(parseISO(a.startTime), new Date()),
  );
  const past = appointments.filter((a) => ['COMPLETED', 'CANCELLED'].includes(a.status));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-brand-600 to-purple-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/80 text-sm">{greeting()},</p>
            <h1 className="text-3xl font-bold mt-1">{user?.name} 👋</h1>
            <p className="text-white/70 mt-2">Manage your beauty appointments all in one place</p>
          </div>
          <div className="hidden sm:block">
            <Star size={60} className="text-white/20" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 flex-wrap">
          <Link to="/appointments/book" className="bg-white text-brand-700 px-4 py-2 rounded-xl font-medium text-sm hover:bg-brand-50 transition-colors flex items-center gap-2">
            <PlusCircle size={16} /> Book Appointment
          </Link>
          <Link to="/appointments" className="bg-white/20 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-white/30 transition-colors flex items-center gap-2">
            <Calendar size={16} /> View Schedule
          </Link>
          <Link to="/appointments/history" className="bg-white/20 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-white/30 transition-colors flex items-center gap-2">
            <History size={16} /> History
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-600">{upcoming.length}</p>
          <p className="text-sm text-gray-500 mt-1">Upcoming</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{past.filter((a) => a.status === 'COMPLETED').length}</p>
          <p className="text-sm text-gray-500 mt-1">Completed</p>
        </div>
        <div className="card text-center col-span-2 sm:col-span-1">
          <p className="text-3xl font-bold text-gray-700">{appointments.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total bookings</p>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Updates from your provider</h2>
          </div>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-brand-50 rounded-xl p-4">
                <p className="font-medium text-brand-900 text-sm">{ann.title}</p>
                <p className="text-brand-700 text-sm mt-1">{ann.content}</p>
                <p className="text-brand-400 text-xs mt-2">{format(parseISO(ann.createdAt), 'MMM d, yyyy')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
          </div>
          <Link to="/appointments/book" className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
            <PlusCircle size={14} /> Book
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No upcoming appointments.</p>
            <Link to="/appointments/book" className="text-brand-600 text-sm font-medium hover:underline mt-1 block">
              Book your first appointment →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-brand-700">{format(parseISO(appt.startTime), 'MMM').toUpperCase()}</span>
                  <span className="text-lg font-bold text-brand-700 leading-tight">{format(parseISO(appt.startTime), 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{appt.service?.name}</p>
                  <p className="text-gray-500 text-xs">{format(parseISO(appt.startTime), 'EEEE, h:mm a')} · {appt.provider?.providerProfile?.businessName || appt.provider?.name}</p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent history */}
      {past.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Recent History</h2>
          </div>
          <div className="space-y-2">
            {past.slice(0, 3).map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 py-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{appt.service?.name}</p>
                  <p className="text-xs text-gray-400">{format(parseISO(appt.startTime), 'MMM d, yyyy')}</p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
          <Link to="/appointments/history" className="text-brand-600 text-sm font-medium hover:underline mt-3 block">
            View all history →
          </Link>
        </div>
      )}
    </div>
  );
}
