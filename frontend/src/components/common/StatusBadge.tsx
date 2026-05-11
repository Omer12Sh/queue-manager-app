import type { AppointmentStatus } from '../../types';

const config: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
  RESCHEDULED: { label: 'Rescheduled', className: 'bg-purple-100 text-purple-700' },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return <span className={`badge ${className}`}>{label}</span>;
}
