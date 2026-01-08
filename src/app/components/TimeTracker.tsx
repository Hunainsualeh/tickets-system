
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Clock, History } from 'lucide-react';
import { Button } from './Button';
import { formatRelativeTime } from '@/lib/utils';
import { useToast } from './ToastContainer';

interface WorkLog {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  user?: {
    username: string;
  };
}

interface TimeTrackerProps {
  ticketId: string;
  currentUser: any;
}

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export function TimeTracker({ ticketId, currentUser }: TimeTrackerProps) {
  const [activeLog, setActiveLog] = useState<WorkLog | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-logs?ticketId=${ticketId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        console.error('Failed to fetch logs:', res.status);
        return;
      }
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        // Find active log for current user
        const active = data.logs.find((l: any) => l.userId === currentUser.id && !l.endTime);
        setActiveLog(active || null);
      }
    } catch (error) {
      console.error('Failed to fetch logs', error);
    }
  }, [ticketId, currentUser.id]);

  useEffect(() => {
    fetchLogs();
  }, [ticketId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeLog) {
      const start = new Date(activeLog.startTime).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000); // in seconds
        setElapsedTime(diff);
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => clearInterval(interval);
  }, [activeLog]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/work-logs/check-in', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Checked in successfully');
        fetchLogs();
      } else {
        toast.error(data.error || 'Failed to check in');
      }
    } catch (error) {
      toast.error('Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      const res = await fetch('/api/work-logs/check-out', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ logId: activeLog.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Checked out. Duration: ${data.log.duration} minutes`);
        fetchLogs();
      } else {
        toast.error(data.error || 'Failed to check out');
      }
    } catch (error) {
      toast.error('Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4" /> Time Tracking
          </h3>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {totalHours}h {totalMinutes}m <span className="text-sm font-normal text-slate-500">total tracked</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
           {activeLog ? (
             <div className="flex items-center gap-3 w-full sm:w-auto bg-green-50 p-2 rounded-xl border border-green-100">
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded font-mono font-bold animate-pulse">
                    {formatTime(elapsedTime)}
                </div>
                <Button 
                    onClick={handleCheckOut} 
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none border-0"
                >
                    {loading ? 'Processing...' : (
                        <>
                            <Square className="w-4 h-4 mr-2 fill-current" /> Stop Timer
                        </>
                    )}
                </Button>
             </div>
           ) : (
             <Button 
                onClick={handleCheckIn} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto border-0"
             >
                {loading ? 'Starting...' : (
                    <>
                        <Play className="w-4 h-4 mr-2 fill-current" /> Start Timer
                    </>
                )}
             </Button>
           )}
        </div>
      </div>

      {logs.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                  <History className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">Recent Sessions</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {logs.map(log => (
                      <div key={log.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2">
                              {log.user?.username && (
                                  <span className="font-semibold text-slate-700 w-20 truncate" title={log.user.username}>
                                      {log.user.username}
                                  </span>
                              )}
                              <span className="text-slate-500">
                                  {new Date(log.startTime).toLocaleDateString()} {new Date(log.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  {log.endTime && ` - ${new Date(log.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                              </span>
                          </div>
                          <div className="font-mono text-slate-600">
                              {log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : <span className="text-green-600 font-bold">Active</span>}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}
