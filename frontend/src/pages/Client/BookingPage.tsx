import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceApi, appointmentApi, userApi } from '../../services/api';
import type { Service, User, TimeSlot } from '../../types';
import { Clock, ChevronRight, Check, Sparkles } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, addDays, startOfDay } from 'date-fns';

type Step = 'provider' | 'service' | 'date' | 'time' | 'confirm';

export default function BookingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('provider');
  const [providers, setProviders] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<User | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Dates to show
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(startOfDay(new Date()), i + 1);
    return format(d, 'yyyy-MM-dd');
  });

  useEffect(() => {
    userApi.getAll({ role: 'SERVICE_PROVIDER' }).then((res) => setProviders(res.data));
  }, []);

  const handleSelectProvider = async (provider: User) => {
    setSelectedProvider(provider);
    setIsLoading(true);
    const res = await serviceApi.getByProvider(provider.id);
    setServices(res.data);
    setIsLoading(false);
    setStep('service');
  };

  const handleSelectService = (svc: Service) => {
    setSelectedService(svc);
    setStep('date');
  };

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setIsLoading(true);
    const res = await appointmentApi.getAvailableSlots(selectedProvider!.id, date, selectedService!.id);
    setSlots(res.data);
    setIsLoading(false);
    setStep('time');
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
        serviceId: selectedService!.id,
        startTime: selectedSlot!.startTime,
        notes,
      });
      toast.success('Appointment booked! ��');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Booking failed';
      toast.error(msg);
    } finally {
      setBooking(false);
    }
  };

  const stepLabels: { step: Step; label: string }[] = [
    { step: 'provider', label: 'Provider' },
    { step: 'service', label: 'Service' },
    { step: 'date', label: 'Date' },
    { step: 'time', label: 'Time' },
    { step: 'confirm', label: 'Confirm' },
  ];
  const stepIndex = stepLabels.findIndex((s) => s.step === step);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book an Appointment</h1>
        <p className="text-gray-500 text-sm mt-1">Choose your provider, service, and time</p>
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

      {isLoading ? <LoadingSpinner /> : (
        <>
          {/* Step: Provider */}
          {step === 'provider' && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Choose a Service Provider</h2>
              <div className="space-y-3">
                {providers.map((p) => (
                  <button key={p.id} onClick={() => handleSelectProvider(p)} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-left">
                    <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">{p.name.charAt(0)}</div>
                    <div>
                      <p className="font-medium text-gray-900">{p.providerProfile?.businessName || p.name}</p>
                      {p.providerProfile?.description && <p className="text-sm text-gray-500 line-clamp-1">{p.providerProfile.description}</p>}
                    </div>
                    <ChevronRight size={18} className="ml-auto text-gray-400" />
                  </button>
                ))}
                {providers.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No providers available</p>}
              </div>
            </div>
          )}

          {/* Step: Service */}
          {step === 'service' && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Choose a Service</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <button key={svc.id} onClick={() => handleSelectService(svc)} className="p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-left transition-colors">
                    <Sparkles size={18} className="text-brand-600 mb-2" />
                    <p className="font-medium text-gray-900">{svc.name}</p>
                    {svc.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><Clock size={13} />{svc.durationMin}min</span>
                      <span className="font-semibold text-brand-700">₪{svc.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Date */}
          {step === 'date' && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Choose a Date</h2>
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
              <h2 className="font-semibold text-gray-900 mb-4">Choose a Time — {selectedDate}</h2>
              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No available slots for this date.</p>
                  <button onClick={() => setStep('date')} className="btn-secondary mt-4">← Back to dates</button>
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
          {step === 'confirm' && selectedProvider && selectedService && selectedSlot && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Confirm Your Appointment</h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Provider</span><span className="font-medium">{selectedProvider.providerProfile?.businessName || selectedProvider.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Service</span><span className="font-medium">{selectedService.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Date</span><span className="font-medium">{format(new Date(selectedSlot.startTime), 'EEEE, MMMM d, yyyy')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Time</span><span className="font-medium">{format(new Date(selectedSlot.startTime), 'h:mm a')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Duration</span><span className="font-medium">{selectedService.durationMin} minutes</span></div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-3"><span className="text-gray-700 font-medium">Price</span><span className="font-bold text-brand-700">₪{selectedService.price}</span></div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea className="input resize-none h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests…" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('time')} className="btn-secondary flex-1">← Back</button>
                <button onClick={handleBook} disabled={booking} className="btn-primary flex-1">
                  {booking ? 'Booking…' : '✓ Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
