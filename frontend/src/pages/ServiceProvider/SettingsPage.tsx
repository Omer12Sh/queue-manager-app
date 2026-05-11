import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { providerApi } from '../../services/api';
import type { ProviderProfile } from '../../types';
import { Save, Building2, Clock, Megaphone, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS: Record<string, string> = {
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [, setProfile] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ businessName: '', description: '', address: '', workingHours: {} as Record<string, { open: string; close: string } | null> });
  const [annForm, setAnnForm] = useState({ title: '', content: '' });
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; content: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, annRes] = await Promise.allSettled([
          providerApi.getProfile(user!.id),
          providerApi.getAnnouncements(user!.id),
        ]);
        if (profileRes.status === 'fulfilled') {
          const p = profileRes.value.data;
          setProfile(p);
          setForm({ businessName: p.businessName, description: p.description || '', address: p.address || '', workingHours: p.workingHours || {} });
        }
        if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data);
      } finally { setIsLoading(false); }
    };
    load();
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await providerApi.updateProfile(form);
      toast.success('Profile updated');
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: prev.workingHours[day] ? null : { open: '09:00', close: '18:00' },
      },
    }));
  };

  const setHours = (day: string, field: 'open' | 'close', val: string) => {
    setForm((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: { ...(prev.workingHours[day] || { open: '09:00', close: '18:00' }), [field]: val },
      },
    }));
  };

  const handleAddAnn = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await providerApi.createAnnouncement(annForm);
      setAnnouncements((prev) => [res.data, ...prev]);
      setAnnForm({ title: '', content: '' });
      toast.success('Announcement created');
    } catch { toast.error('Failed to create announcement'); }
  };

  const handleDeleteAnn = async (id: string) => {
    await providerApi.deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    toast.success('Announcement deleted');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your business profile and preferences</p>
      </div>

      {/* Business profile */}
      <form onSubmit={handleSave} className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">Business Profile</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
          <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input resize-none h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell clients about your services…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your business address" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Working hours */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">Working Hours</h2>
        </div>
        <div className="space-y-2">
          {DAYS.map((day) => {
            const hours = form.workingHours[day];
            return (
              <div key={day} className="flex items-center gap-4">
                <div className="w-6">
                  <input type="checkbox" checked={!!hours} onChange={() => toggleDay(day)} className="rounded" />
                </div>
                <span className="w-24 text-sm text-gray-700">{DAY_LABELS[day]}</span>
                {hours ? (
                  <div className="flex items-center gap-2">
                    <input type="time" className="input w-32 text-sm py-1" value={hours.open} onChange={(e) => setHours(day, 'open', e.target.value)} />
                    <span className="text-gray-400 text-sm">—</span>
                    <input type="time" className="input w-32 text-sm py-1" value={hours.close} onChange={(e) => setHours(day, 'close', e.target.value)} />
                  </div>
                ) : <span className="text-sm text-gray-400">Closed</span>}
              </div>
            );
          })}
        </div>
        <button onClick={handleSave} className="btn-primary mt-4 flex items-center gap-2">
          <Save size={16} /> Save Hours
        </button>
      </div>

      {/* Announcements */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">Client Announcements</h2>
        </div>
        <form onSubmit={handleAddAnn} className="space-y-3 mb-6">
          <input className="input" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="Announcement title" required />
          <textarea className="input resize-none h-20" value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Message for your clients…" required />
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Post Announcement
          </button>
        </form>
        {announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map((ann) => (
              <div key={ann.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{ann.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{ann.content}</p>
                </div>
                <button onClick={() => handleDeleteAnn(ann.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
