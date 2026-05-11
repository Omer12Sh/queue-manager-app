import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { serviceApi } from '../../services/api';
import type { Service } from '../../types';
import { Plus, Edit2, Trash2, Clock, DollarSign, Sparkles } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

interface ServiceForm {
  name: string;
  description: string;
  durationMin: number;
  price: number;
}

const emptyForm: ServiceForm = { name: '', description: '', durationMin: 30, price: 0 };

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await serviceApi.getByProvider(user!.id);
      setServices(res.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const res = await serviceApi.update(editingId, form);
        setServices((prev) => prev.map((s) => (s.id === editingId ? res.data : s)));
        toast.success('Service updated');
      } else {
        const res = await serviceApi.create(form);
        setServices((prev) => [...prev, res.data]);
        toast.success('Service created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (svc: Service) => {
    setForm({ name: svc.name, description: svc.description || '', durationMin: svc.durationMin, price: svc.price });
    setEditingId(svc.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    await serviceApi.delete(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success('Service removed');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your offerings and pricing</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Service
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-brand-200 border-2">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? 'Edit Service' : 'New Service'}</h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Eyebrow Threading" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input resize-none h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
              <input type="number" className="input" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: +e.target.value })} min={5} step={5} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₪) *</label>
              <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} min={0} step={0.01} required />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      {services.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Add your first service to let clients start booking appointments"
          icon={<Sparkles size={28} />}
          action={<button onClick={() => setShowForm(true)} className="btn-primary">Add Service</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <Sparkles size={18} className="text-brand-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(svc)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(svc.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{svc.name}</h3>
              {svc.description && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{svc.description}</p>}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock size={14} className="text-gray-400" />
                  {svc.durationMin} min
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-brand-700">
                  <DollarSign size={14} />
                  ₪{svc.price}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
