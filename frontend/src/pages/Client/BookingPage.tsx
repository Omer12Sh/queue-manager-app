import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, appointmentApi, userApi } from '../../services/api';
import type { Service, User, TimeSlot } from '../../types';
import { Clock, ChevronRight, Check, Sparkles, Plus, Minus } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, addDays, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

type Step = 'service' | 'date' | 'time' | 'confirm';

export default function BookingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<User | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [booking, setBooking] = useState(false);
  const { t } = useTranslation();

  // Dates to show
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(startOfDay(new Date()), i + 1);
    return format(d, 'yyyy-MM-dd');
  });

  useEffect(() => {
    // Auto-select the first (and only) service provider
    userApi.getAll({ role: 'SERVICE_PROVIDER' }).then((res) => {
      const providers: User[] = res.data;
      if (providers.length === 0) {
        setLoadError(t('booking.noProviders'));
        return;
      }
      const provider = providers[0];
      setSelectedProvider(provider);
      return serviceApi.getByProvider(provider.id).then((svcRes) => {
        setServices(svcRes.data);
        if (svcRes.data.length === 0) {
          setLoadError(t('booking.noServices'));
        }
      });
    }).catch(() => {
      setLoadError(t('booking.loadFailed'));
    }).finally(() => setIsLoading(false));
  }, [t]);

  const toggleService = (svc: Service) => {
    setSelectedServices((prev) => {
      const already = prev.find((s) => s.id === svc.id);
      return already ? prev.filter((s) => s.id !== svc.id) : [...prev, svc];
    });
  };

  const totalDuration = selectedServices.reduce((s, svc) => s + svc.durationMin, 0);
  const totalPrice = selectedServices.reduce((s, svc) => s + svc.price, 0);

  const handleProceedToDate = () => {
    if (selectedServices.length === 0) {
      toast.error(t('booking.noServiceSelected'));
      return;
    }
    setStep('date');
  };

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setIsLoading(true);
    try {
      const serviceIds = selectedServices.map((s) => s.id);
      const res = await appointmentApi.getAvailableSlots(selectedProvider!.id, date, serviceIds);
      setSlots(res.data);
      setStep('time');
    } catch {
      toast.error(t('booking.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('confirm');
  };

  const handleBook = async () => {
    setBooking(true);
    try {
      await appointmentApi.create({
        providerId: selectedProvider!.id,
        serviceIds: selectedServices.map((s) => s.id),
        startTime: selectedSlot!.startTime,
        notes,
      });
      toast.success(t('booking.bookingSuccess'));
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('booking.bookingFailed');
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  };

  const stepLabels: { step: Step; label: string }[] = [
    { step: 'service', label: t('booking.stepService') },
    { step: 'date', label: t('booking.stepDate') },
    { step: 'time', label: t('booking.stepTime') },
    { step: 'confirm', label: t('booking.stepConfirm') },
  ];
  const stepIndex = stepLabels.findIndex((s) => s.step === step);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('booking.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('booking.subtitle')}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {stepLabels.map((s, i) => (
          <div key={s.step} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${i < stepIndex ? 'bg-green-500 text-white' : i === stepIndex ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < stepIndex ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === stepIndex ? 'text-brand-700 font-medium' : 'text-gray-400'}`}>{s.label}</span>
            {i < stepLabels.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : loadError ? (
        <div className="card text-center py-10 text-gray-400">
          <p>{loadError}</p>
        </div>
      ) : (
        <>
          {/* Step: Service (multi-select) */}
          {step === 'service' && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-1">{t('booking.chooseService')}</h2>
              <p className="text-xs text-gray-400 mb-4">{t('booking.chooseServiceHint')}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {services.map((svc) => {
                  const selected = !!selectedServices.find((s) => s.id === svc.id);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleService(svc)}
                      className={`p-4 rounded-xl border text-left transition-colors relative ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <Sparkles size={18} className={selected ? 'text-brand-600' : 'text-gray-400'} />
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${selected ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300'}`}>
                          {selected ? <Minus size={10} /> : <Plus size={10} />}
                        </span>
                      </div>
                      <p className={`font-medium mt-2 ${selected ? 'text-brand-900' : 'text-gray-900'}`}>{svc.name}</p>
                      {svc.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-gray-500 flex items-center gap-1"><Clock size={13} />{svc.durationMin}min</span>
                        <span className="font-semibold text-brand-700">₪{svc.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedServices.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between text-sm">
                  <span className="text-brand-700">
                    {selectedServices.length} {t('booking.servicesSelected')} · {totalDuration}min · ₪{totalPrice}
                  </span>
                  <button onClick={handleProceedToDate} className="btn-primary py-1.5 px-4 text-sm">
                    {t('booking.next')} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step: Date */}
          {step === 'date' && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('booking.chooseDate')}</h2>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {dates.map((date) => {
                  const d = new Date(date + 'T12:00:00');
                  return (
                    <button key={date} onClick={() => handleSelectDate(date)} className={`p-3 rounded-xl border text-center hover:border-brand-400 hover:bg-brand-50 transition-colors ${selectedDate === date ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                      <p className="text-xs text-gray-400">{format(d, 'EEE')}</p>
                      <p className="text-lg font-bold text-gray-900 leading-tight">{format(d, 'd')}</p>
                      <p className="text-xs text-gray-400">{format(d, 'MMM')}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Time */}
          {step === 'time' && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('booking.chooseTime')} — {selectedDate}</h2>
              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">{t('booking.noSlots')}</p>
                  <button onClick={() => setStep('date')} className="btn-secondary mt-4">{t('booking.backToDates')}</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button key={slot.startTime} onClick={() => handleSelectSlot(slot)} className={`p-3 rounded-xl border text-center text-sm font-medium hover:border-brand-400 hover:bg-brand-50 transition-colors ${selectedSlot?.startTime === slot.startTime ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-700'}`}>
                      {format(new Date(slot.startTime), 'h:mm a')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && selectedProvider && selectedServices.length > 0 && selectedSlot && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">{t('booking.confirmTitle')}</h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex justify-between text-sm"><span className="text-gray-500">{t('booking.providerLabel')}</span><span className="font-medium">{selectedProvider.providerProfile?.businessName || selectedProvider.name}</span></div>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-500">{t('booking.serviceLabel')}</span>
                  {selectedServices.map((svc) => (
                    <div key={svc.id} className="flex justify-between ml-2">
                      <span className="text-gray-700">{svc.name}</span>
                      <span className="text-gray-500">{svc.durationMin}min · ₪{svc.price}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">{t('booking.dateLabel')}</span><span className="font-medium">{format(new Date(selectedSlot.startTime), 'EEEE, MMMM d, yyyy')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">{t('booking.timeLabel')}</span><span className="font-medium">{format(new Date(selectedSlot.startTime), 'h:mm a')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">{t('booking.durationLabel')}</span><span className="font-medium">{totalDuration} {t('booking.minutes')}</span></div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-3"><span className="text-gray-700 font-medium">{t('booking.priceLabel')}</span><span className="font-bold text-brand-700">₪{totalPrice}</span></div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('booking.notesLabel')}</label>
                <textarea className="input resize-none h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('booking.notesPlaceholder')} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('time')} className="btn-secondary flex-1">{t('booking.back')}</button>
                <button onClick={handleBook} disabled={booking} className="btn-primary flex-1">
                  {booking ? t('booking.booking') : t('booking.confirmButton')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

