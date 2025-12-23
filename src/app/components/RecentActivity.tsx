import React from 'react';
import { User, Ticket, MessageSquare, UserPlus, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export type ActivityType = 'TICKET_CREATED' | 'TICKET_RESOLVED' | 'USER_JOINED' | 'NOTE_ADDED' | 'STATUS_CHANGED';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  entityId?: string; // ID of the ticket, user, etc.
}

interface RecentActivityProps {
  activities: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'TICKET_CREATED':
      return <AlertCircle className="w-4 h-4 text-blue-600" />;
    case 'TICKET_RESOLVED':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'USER_JOINED':
      return <UserPlus className="w-4 h-4 text-purple-600" />;
    case 'NOTE_ADDED':
      return <MessageSquare className="w-4 h-4 text-amber-600" />;
    case 'STATUS_CHANGED':
      return <Clock className="w-4 h-4 text-slate-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-slate-600" />;
  }
};

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'TICKET_CREATED':
      return 'bg-blue-50 border-blue-100';
    case 'TICKET_RESOLVED':
      return 'bg-green-50 border-green-100';
    case 'USER_JOINED':
      return 'bg-purple-50 border-purple-100';
    case 'NOTE_ADDED':
      return 'bg-amber-50 border-amber-100';
    case 'STATUS_CHANGED':
      return 'bg-slate-50 border-slate-100';
    default:
      return 'bg-slate-50 border-slate-100';
  }
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, onItemClick }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-900">Recent Activity</h3>
      </div>
      <div className="p-0">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">No recent activity</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${onItemClick ? 'cursor-pointer' : ''}`}
                onClick={() => onItemClick && onItemClick(activity)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {activity.user && (
                      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {activity.user.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(activity.timestamp.toISOString())}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
