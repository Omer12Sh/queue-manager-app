import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { providerApi } from '../../services/api';
import type { ProviderProfile, AvailabilityOverride } from '../../types';
import { Save, Building2, Megaphone, Plus, Trash2, Globe, CalendarDays, X } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { format, addMonths, startOfMonth, getDaysInMonth, addDays } from 'date-fns';

// Generate time slots from 06:00 to 22:00 at the given interval (minutes)
const generateTimeSlots = (intervalMin: number) => {
  const slots: string[] = [];
  const start = 6 * 60; // 06:00
  const end = 22 * 60;  // 22:00
  for (let m = start; m < end; m += intervalMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return slots;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [, setProfile] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ businessName: '', description: '', address: '' });
  const [annForm, setAnnForm] = useState({ title: '', content: '' });
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; content: string }[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [calMonth, setCalMonth] = useState(startOfMonth(new Date()));
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [editIsOff, setEditIsOff] = useState(false);
  const [slotInterval, setSlotInterval] = useState(30); // minutes between slot options
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, annRes, overrideRes] = await Promise.allSettled([
          providerApi.getProfile(user!.id),
          providerApi.getAnnouncements(user!.id),
          providerApi.getAvailabilityOverrides(user!.id),
        ]);
        if (profileRes.status === 'fulfilled') {
          const p = profileRes.value.data;
          setProfile(p);
          setForm({ businessName: p.businessName, description: p.description || '', address: p.address || '' });
        }
        if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data);
        if (overrideRes.status === 'fulfilled') setOverrides(overrideRes.value.data);
      } finally { setIsLoading(false); }
    };
    load();
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await providerApi.updateProfile(form);
      toast.success(t('settings.profileUpdated'));
    } catch { toast.error(t('settings.saveFailed')); } finally { setSaving(false); }
  };

  const handleSaveLanguage = async (lang: string) => {
    setLanguage(lang);
    try {
      await providerApi.updateProfile({ defaultLanguage: lang });
      toast.success(t('settings.languageSaved'));
    } catch { /* language still applied locally */ }
  };

  const handleAddAnn = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await providerApi.createAnnouncement(annForm);
      setAnnouncements((prev) => [res.data, ...prev]);
      setAnnForm({ title: '', content: '' });
      toast.success(t('settings.annCreated'));
    } catch { toast.error(t('settings.annFailed')); }
  };

  const handleDeleteAnn = async (id: string) => {
    await providerApi.deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    toast.success(t('settings.annDeleted'));
  };

  // Calendar availability helpers
  const calDays = Array.from({ length: getDaysInMonth(calMonth) }, (_, i) =>
    format(addDays(startOfMonth(calMonth), i), 'yyyy-MM-dd'),
  );

  const getOverride = (date: string) => overrides.find((o) => o.date === date);

  const openEditDate = (date: string) => {
    const ov = getOverride(date);
    setEditingDate(date);
    setEditIsOff(ov?.isOff ?? false);
    // slots is now string[] in new format
    setEditSlots(Array.isArray(ov?.slots) && ov.slots.length > 0 && typeof ov.slots[0] === 'string'
      ? [...(ov.slots as string[])]
      : [],
    );
  };

  const handleSaveOverride = async () => {
    if (!editingDate) return;
    try {
      const res = await providerApi.upsertAvailabilityOverride({ date: editingDate, isOff: editIsOff, slots: editIsOff ? [] : editSlots });
      setOverrides((prev) => {
        const idx = prev.findIndex((o) => o.date === editingDate);
        if (idx >= 0) { const next = [...prev]; next[idx] = res.data; return next; }
        return [...prev, res.data];
      });
      toast.success(t('settings.availabilityUpdated'));
      setEditingDate(null);
    } catch { toast.error(t('settings.saveFailed')); }
  };

  const handleDeleteOverride = async (date: string) => {
    await providerApi.deleteAvailabilityOverride(date);
    setOverrides((prev) => prev.filter((o) => o.date !== date));
    toast.success(t('settings.availabilityRemoved'));
    setEditingDate(null);
  };


  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Business profile */}
      <form onSubmit={handleSave} className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">{t('settings.businessProfile')}</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.businessNameLabel')}</label>
          <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.descriptionLabel')}</label>
          <textarea className="input resize-none h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('settings.descriptionPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.addressLabel')}</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('settings.addressPlaceholder')} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? t('settings.savingProfile') : t('settings.saveProfile')}
        </button>
      </form>

      {/* Language preference */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">{t('settings.languagePreference')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{t('settings.languageLabel')}</p>
        <div className="flex gap-3 flex-wrap">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSaveLanguage(lang.code)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                language === lang.code
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.label}</span>
              {language === lang.code && <span className="text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly calendar availability */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">{t('settings.monthlyAvailability')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{t('settings.monthlyAvailabilityHint')}</p>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCalMonth((m) => addMonths(m, -1))} className="btn-secondary py-1 px-3 text-sm">‹</button>
          <span className="font-semibold text-gray-800">{format(calMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCalMonth((m) => addMonths(m, 1))} className="btn-secondary py-1 px-3 text-sm">›</button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay() }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {calDays.map((date) => {
            const ov = getOverride(date);
            const dayNum = parseInt(date.split('-')[2]);
            return (
              <button
                key={date}
                onClick={() => openEditDate(date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-colors border ${
                  ov?.isOff
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : ov
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-brand-50 hover:border-brand-300'
                }`}
              >
                {dayNum}
                {ov && <span className="text-[8px] mt-0.5">{ov.isOff ? '✗' : '✓'}</span>}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">{t('settings.calendarLegend')}</p>

        {/* Edit overlay */}
        {editingDate && (
          <div className="mt-4 p-4 rounded-xl border border-brand-200 bg-brand-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-brand-900 text-sm">{editingDate}</h3>
              <button onClick={() => setEditingDate(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={editIsOff} onChange={(e) => setEditIsOff(e.target.checked)} className="rounded" />
              {t('settings.markDayOff')}
            </label>

            {!editIsOff && (
              <div className="space-y-3">
                {/* Interval selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600">{t('settings.slotIntervalLabel')}</span>
                  {[15, 20, 30, 45, 60].map((iv) => (
                    <button
                      key={iv}
                      type="button"
                      onClick={() => setSlotInterval(iv)}
                      className={`px-2 py-1 rounded-lg text-xs border font-medium transition-colors ${
                        slotInterval === iv
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      }`}
                    >{iv}{t('settings.minAbbr')}</button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">{t('settings.selectTimeSlots')}</p>
                {/* Slot grid */}
                <div className="flex flex-wrap gap-1 max-h-60 overflow-y-auto">
                  {generateTimeSlots(slotInterval).map((ts) => {
                    const isSelected = editSlots.includes(ts);
                    return (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => setEditSlots((prev) =>
                          isSelected ? prev.filter((s) => s !== ts) : [...prev, ts].sort(),
                        )}
                        className={`px-2 py-1 rounded-lg text-xs border font-medium transition-colors ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:bg-brand-50'
                        }`}
                      >{ts}</button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  {editSlots.length > 0 ? `${editSlots.length} ${t('settings.slotsSelected')}` : t('settings.noSlotsSelected')}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSaveOverride} className="btn-primary text-sm py-1.5 flex items-center gap-1">
                <Save size={13} /> {t('settings.saveDate')}
              </button>
              {getOverride(editingDate) && (
                <button onClick={() => handleDeleteOverride(editingDate)} className="btn-secondary text-sm py-1.5 text-red-600 border-red-200 hover:bg-red-50">
                  {t('settings.removeOverride')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Announcements */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">{t('settings.announcements')}</h2>
        </div>
        <form onSubmit={handleAddAnn} className="space-y-3 mb-6">
          <input className="input" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder={t('settings.annTitlePlaceholder')} required />
          <textarea className="input resize-none h-20" value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} placeholder={t('settings.annContentPlaceholder')} required />
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> {t('settings.postAnnouncement')}
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

