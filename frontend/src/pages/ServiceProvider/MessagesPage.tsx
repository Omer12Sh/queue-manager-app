import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messageApi, userApi } from '../../services/api';
import type { Message, User, MessageType } from '../../types';
import { MessageSquare, Send, Megaphone, Check } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

type Tab = 'inbox' | 'send' | 'broadcast';

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [tab, setTab] = useState<Tab>('inbox');
  const [isLoading, setIsLoading] = useState(true);
  const [dmForm, setDmForm] = useState({ toId: '', content: '', type: 'IN_APP' as MessageType, phone: '' });
  const [bcForm, setBcForm] = useState({ content: '', type: 'IN_APP' as MessageType, sendExternal: false });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [msgRes, clientRes] = await Promise.allSettled([
        messageApi.getAll(),
        userApi.getAll({ role: 'CLIENT' }),
      ]);
      if (msgRes.status === 'fulfilled') setMessages(msgRes.value.data);
      if (clientRes.status === 'fulfilled') setClients(clientRes.value.data);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSendDM = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await messageApi.send(dmForm);
      toast.success('Message sent!');
      setDmForm({ toId: '', content: '', type: 'IN_APP', phone: '' });
    } catch { toast.error('Failed to send'); } finally { setSending(false); }
  };

  const handleBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await messageApi.broadcast(bcForm);
      toast.success('Broadcast sent to all clients!');
      setBcForm({ content: '', type: 'IN_APP', sendExternal: false });
    } catch { toast.error('Failed to broadcast'); } finally { setSending(false); }
  };

  const handleMarkRead = async (id: string) => {
    await messageApi.markRead(id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  };

  if (isLoading) return <LoadingSpinner />;

  const inbox = messages.filter((m) => m.toId === user!.id || m.toId === null);
  const unread = inbox.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 text-sm mt-1">Communicate with your clients via in-app, SMS or WhatsApp</p>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'inbox', label: 'Inbox', badge: unread },
          { key: 'send', label: 'Send Message' },
          { key: 'broadcast', label: 'Broadcast' },
        ] as { key: Tab; label: string; badge?: number }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {t.label}
            {t.badge ? <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Inbox */}
      {tab === 'inbox' && (
        <div className="card">
          {inbox.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No messages</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {inbox.map((msg) => (
                <div key={msg.id} className={`flex gap-4 py-4 ${!msg.isRead ? 'bg-brand-50 -mx-6 px-6 rounded-xl' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
                    {msg.from?.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">{msg.from?.name}</p>
                      {msg.toId === null && <span className="badge bg-purple-100 text-purple-700">Broadcast</span>}
                      <p className="text-xs text-gray-400 ml-auto">{format(parseISO(msg.sentAt), 'MMM d, h:mm a')}</p>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{msg.content}</p>
                  </div>
                  {!msg.isRead && (
                    <button onClick={() => handleMarkRead(msg.id)} className="text-brand-600 hover:text-brand-700" title="Mark as read">
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send DM */}
      {tab === 'send' && (
        <div className="card max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Send Direct Message</h2>
          </div>
          <form onSubmit={handleSendDM} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
              <select className="input" value={dmForm.toId} onChange={(e) => setDmForm({ ...dmForm, toId: e.target.value })} required>
                <option value="">Select a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel *</label>
              <select className="input" value={dmForm.type} onChange={(e) => setDmForm({ ...dmForm, type: e.target.value as MessageType })}>
                <option value="IN_APP">In-App notification</option>
                <option value="SMS">SMS (requires Twilio)</option>
                <option value="WHATSAPP">WhatsApp (requires Twilio)</option>
              </select>
            </div>
            {(dmForm.type === 'SMS' || dmForm.type === 'WHATSAPP') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number *</label>
                <input className="input" value={dmForm.phone} onChange={(e) => setDmForm({ ...dmForm, phone: e.target.value })} placeholder="+1 555 123 4567" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea className="input resize-none h-28" value={dmForm.content} onChange={(e) => setDmForm({ ...dmForm, content: e.target.value })} placeholder="Write your message…" required />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={16} /> {sending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      )}

      {/* Broadcast */}
      {tab === 'broadcast' && (
        <div className="card max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Broadcast to All Clients</h2>
          </div>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select className="input" value={bcForm.type} onChange={(e) => setBcForm({ ...bcForm, type: e.target.value as MessageType })}>
                <option value="IN_APP">In-App only</option>
                <option value="SMS">SMS broadcast (Twilio)</option>
                <option value="WHATSAPP">WhatsApp broadcast (Twilio)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea className="input resize-none h-32" value={bcForm.content} onChange={(e) => setBcForm({ ...bcForm, content: e.target.value })} placeholder="e.g. We're running 15 minutes late today. Thank you for your patience!" required />
            </div>
            {(bcForm.type === 'SMS' || bcForm.type === 'WHATSAPP') && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sendExternal" checked={bcForm.sendExternal} onChange={(e) => setBcForm({ ...bcForm, sendExternal: e.target.checked })} className="rounded" />
                <label htmlFor="sendExternal" className="text-sm text-gray-700">Actually send via Twilio (uses credits)</label>
              </div>
            )}
            <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
              <Megaphone size={16} /> {sending ? 'Broadcasting…' : `Broadcast to ${clients.length} clients`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
