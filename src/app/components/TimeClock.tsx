'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Play, Square, Timer } from 'lucide-react';
import { useToast } from './ToastContainer';

interface TimeClockProps {
  userId: string;
  onClockOut?: () => void;
}

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export function TimeClock({ userId, onClockOut }: TimeClockProps) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  useEffect(() => {
    checkActiveSession();
    return () => stopTimer();
  }, []);

  useEffect(() => {
    if (activeSession) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [activeSession]);

  const startTimer = () => {
    stopTimer();
    if (!activeSession) return;
    
    // Calculate initial elapsed time
    const startTime = new Date(activeSession.startTime).getTime();
    const now = new Date().getTime();
    setElapsed(Math.floor((now - startTime) / 1000));

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkActiveSession = async () => {
    try {
      const res = await fetch('/api/work-logs/active', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.activeSession) {
        setActiveSession(data.activeSession);
      } else {
        setActiveSession(null);
      }
      setTodayMinutes(data.todayMinutes || 0);
    } catch (error) {
      console.error('Failed to check active session', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/work-logs/clock-in', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Failed to clock in');
      
      const data = await res.json();
      setActiveSession(data.workLog);
      toast.success('Clocked in successfully');
    } catch (error) {
      toast.error('Could not clock in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/work-logs/${activeSession.id}/clock-out`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) throw new Error('Failed to clock out');
      
      setActiveSession(null);
      setElapsed(0);
      setTodayMinutes(prev => prev + Math.round(elapsed / 60)); // Optimistic update
      toast.success('Session saved successfully');
      if (onClockOut) onClockOut();
    } catch (error) {
      toast.error('Could not clock out');
    } finally {
      setIsLoading(false);
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Accent indicator */}
      <div className={`absolute top-0 left-0 w-full h-1 ${activeSession ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
      
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSession ? 'bg-emerald-50' : 'bg-slate-50'}`}>
          <Timer className={`w-5 h-5 ${activeSession ? 'text-emerald-600' : 'text-slate-500'}`} />
        </div>
        {activeSession ? (
          <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Active
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
            Ready
          </span>
        )}
      </div>
      
      {/* Timer Display */}
      <div className={`text-2xl font-mono font-bold mb-1 ${activeSession ? 'text-slate-900' : 'text-slate-400'}`}>
        {activeSession ? formatElapsedTime(elapsed) : '00:00:00'}
      </div>
      <p className="text-sm text-slate-500 font-medium mb-4">
        Today: {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m {activeSession ? `+ ${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : ''}
      </p>

      {/* Action Button */}
      {!activeSession ? (
        <Button 
          onClick={handleClockIn} 
          disabled={isLoading}
          size="sm"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm"
        >
          <Play className="w-3.5 h-3.5 mr-1.5" fill="currentColor" />
          Clock In
        </Button>
      ) : (
        <Button 
          onClick={handleClockOut} 
          disabled={isLoading}
          size="sm"
          className="w-full bg-red-600 hover:bg-red-700 text-white text-sm"
        >
          <Square className="w-3.5 h-3.5 mr-1.5" fill="currentColor" />
          Clock Out
        </Button>
      )}
    </div>
  );
}
