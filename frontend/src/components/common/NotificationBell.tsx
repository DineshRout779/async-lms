import { useEffect, useRef, useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/auth/authSelectors';
import { pushNotification, type Notification } from '@/features/notifications/notificationSlice';
import {
  fetchNotifications,
  markRead,
  markAllRead,
  removeNotification,
} from '@/features/notifications/notificationThunks';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router';

const TYPE_STYLES: Record<string, { dot: string; icon: string }> = {
  achievement:        { dot: 'bg-yellow-400', icon: '🏆' },
  assignment_graded:  { dot: 'bg-green-400',  icon: '✅' },
  new_assignment:     { dot: 'bg-blue-400',   icon: '📋' },
  submission_received:{ dot: 'bg-purple-400', icon: '📥' },
  general:            { dot: 'bg-slate-400',  icon: '📣' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const { items, unreadCount, loading } = useAppSelector((s) => s.notifications);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch on mount
  useEffect(() => {
    if (user?.id) dispatch(fetchNotifications());
  }, [user?.id, dispatch]);

  // Socket.io real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(import.meta.env.VITE_API_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('notification:subscribe', { userId: user.id }));
    socket.on('notification:new', (n: Notification) => dispatch(pushNotification(n)));
    return () => { socket.disconnect(); };
  }, [user?.id, dispatch]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (n: Notification) => {
    if (!n.is_read) dispatch(markRead(n.id));
    if (n.link) { navigate(n.link); setOpen(false); }
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch(removeNotification(id));
  };

  return (
    <div className='relative' ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className='relative p-2 text-slate-400 hover:text-slate-600 transition-colors'
        aria-label='Notifications'
      >
        <Bell className='w-5 h-5' />
        {unreadCount > 0 && (
          <span className='absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white leading-none'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className='absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden'>
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-slate-100'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-bold text-slate-800'>Notifications</span>
              {unreadCount > 0 && (
                <span className='text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full'>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className='flex items-center gap-1'>
              {unreadCount > 0 && (
                <button
                  onClick={() => dispatch(markAllRead())}
                  className='p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50'
                  title='Mark all as read'
                >
                  <CheckCheck className='w-4 h-4' />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className='p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-100'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* List */}
          <div className='max-h-96 overflow-y-auto divide-y divide-slate-50'>
            {loading && (
              <div className='py-8 text-center text-sm text-slate-400'>Loading…</div>
            )}
            {!loading && items.length === 0 && (
              <div className='py-10 text-center'>
                <Bell className='w-8 h-8 text-slate-200 mx-auto mb-2' />
                <p className='text-sm text-slate-400'>No notifications yet</p>
              </div>
            )}
            {items.map((n) => {
              const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.general;
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors group ${
                    !n.is_read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {/* Type dot */}
                  <div className='flex-shrink-0 mt-1'>
                    <span className='text-lg leading-none'>{style.icon}</span>
                  </div>

                  <div className='flex-1 min-w-0'>
                    <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <p className='text-xs text-slate-500 mt-0.5 line-clamp-2'>{n.body}</p>
                    <p className='text-[10px] text-slate-400 mt-1'>{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className='flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); dispatch(markRead(n.id)); }}
                        className='p-1 text-slate-400 hover:text-blue-600 rounded'
                        title='Mark as read'
                      >
                        <Check className='w-3.5 h-3.5' />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleRemove(e, n.id)}
                      className='p-1 text-slate-400 hover:text-red-500 rounded'
                      title='Delete'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </button>
                  </div>

                  {/* Unread indicator */}
                  {!n.is_read && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${style.dot}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
