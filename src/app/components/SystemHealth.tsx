import React from 'react';
import { Server, Database, Mail, ShieldCheck, Activity } from 'lucide-react';

interface SystemStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime: string;
  icon: React.ElementType;
}

const statuses: SystemStatus[] = [
  { name: 'API Server', status: 'operational', uptime: '99.9%', icon: Server },
  { name: 'Database', status: 'operational', uptime: '99.99%', icon: Database },
  { name: 'Email Service', status: 'operational', uptime: '99.5%', icon: Mail },
  { name: 'Auth System', status: 'operational', uptime: '100%', icon: ShieldCheck },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational': return 'bg-emerald-500';
    case 'degraded': return 'bg-amber-500';
    case 'down': return 'bg-rose-500';
    case 'maintenance': return 'bg-blue-500';
    default: return 'bg-slate-300';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'operational': return 'Operational';
    case 'degraded': return 'Degraded';
    case 'down': return 'Down';
    case 'maintenance': return 'Maintenance';
    default: return 'Unknown';
  }
};

export const SystemHealth: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-slate-900">System Health</h3>
        </div>
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      <div className="p-4 space-y-4">
        {statuses.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.uptime} uptime</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
              <span className="text-xs font-medium text-slate-600">{getStatusLabel(item.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
