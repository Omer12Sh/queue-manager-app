import { useEffect, useState } from 'react';
import { messageApi } from '../../services/api';
import type { Message } from '../../types';
import { MessageSquare, Check } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    messageApi
      .getAll()
      .then((res) => setMessages(res.data))
      .catch(() => toast.error(t('messages.loadError')))
      .finally(() => setIsLoading(false));
  }, [t]);

  const handleMarkRead = async (id: string) => {
    await messageApi.markRead(id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  };

  const unread = messages.filter((m) => !m.isRead).length;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('messages.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('messages.clientSubtitle')}</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">
            {t('messages.inbox')}
            {unread > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unread}</span>
            )}
          </h2>
        </div>

        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">{t('messages.noMessages')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 py-4 ${!msg.isRead ? 'bg-brand-50 -mx-6 px-6 rounded-xl' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
                  {msg.from?.name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{msg.from?.name}</p>
                    {msg.toId === null && (
                      <span className="badge bg-purple-100 text-purple-700">{t('messages.broadcast')}</span>
                    )}
                    <p className="text-xs text-gray-400 ltr:ml-auto rtl:mr-auto">
                      {format(parseISO(msg.sentAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{msg.content}</p>
                </div>
                {!msg.isRead && (
                  <button
                    onClick={() => handleMarkRead(msg.id)}
                    className="text-brand-600 hover:text-brand-700"
                    title={t('messages.markRead')}
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
