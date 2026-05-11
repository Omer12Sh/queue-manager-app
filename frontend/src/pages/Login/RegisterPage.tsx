import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Role } from '../../types';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'CLIENT' as Role });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.register(form);
      toast.success(t('auth.accountCreated'));
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('auth.registrationFailed');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-4">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('app.name')}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('auth.registerTitle')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.fullNameLabel')}</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('auth.fullNamePlaceholder')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.emailLabel')}</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('auth.emailPlaceholder')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.passwordLabel')}</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('auth.passwordMinLength')} required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.phoneLabel')}</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('auth.phonePlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.roleLabel')}</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="CLIENT">{t('auth.roleClient')}</option>
                <option value="SERVICE_PROVIDER">{t('auth.roleProvider')}</option>
              </select>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

