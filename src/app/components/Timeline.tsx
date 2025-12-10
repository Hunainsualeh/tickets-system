import React, { useMemo } from 'react';
import { Ticket } from '@/types';
import { User, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface TimelineProps {
  tickets: Ticket[];
  currentDate: Date;
}

export const Timeline: React.FC<TimelineProps> = ({ tickets, currentDate }) => {
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const getTicketStyle = (ticket: Ticket) => {
    const start = new Date(ticket.createdAt);
    const end = ticket.status === 'COMPLETED' || ticket.status === 'CLOSED' 
      ? new Date(ticket.updatedAt) 
      : new Date(); // If active, extend to now

    // Clamp to current month
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let startDay = start.getDate();
    let endDay = end.getDate();

    // If start is before this month, start at 1
    if (start.getMonth() < currentMonth || start.getFullYear() < currentYear) {
      startDay = 1;
    } else if (start.getMonth() > currentMonth || start.getFullYear() > currentYear) {
      return null; // Don't show
    }

    // If end is after this month, end at daysInMonth
    if (end.getMonth() > currentMonth || end.getFullYear() > currentYear) {
      endDay = daysInMonth;
    } else if (end.getMonth() < currentMonth || end.getFullYear() < currentYear) {
      return null; // Don't show
    }
    
    // If start is after end (shouldn't happen but safety), swap or fix
    if (startDay > endDay) endDay = startDay;

    const duration = Math.max(1, endDay - startDay + 1);

    let colorClass = 'bg-blue-500';
    if (ticket.status === 'PENDING') colorClass = 'bg-amber-500';
    if (ticket.status === 'COMPLETED') colorClass = 'bg-emerald-500';
    if (ticket.status === 'CLOSED') colorClass = 'bg-slate-500';
    if (ticket.priority === 'P1') colorClass = 'bg-rose-500';

    return {
      gridColumnStart: startDay,
      gridColumnEnd: `span ${duration}`,
      className: `${colorClass} h-6 rounded-full shadow-sm opacity-90 hover:opacity-100 transition-opacity cursor-pointer relative group`
    };
  };

  // Filter tickets for this month
  const monthTickets = useMemo(() => {
    return tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [tickets, currentDate]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[200px_1fr] gap-4 mb-4">
          <div className="font-semibold text-slate-500 pt-8 pl-2">Ticket / Task</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
            {days.map(day => (
              <div key={day} className="text-center border-l border-slate-100 py-2">
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', { weekday: 'narrow' })}
                </div>
                <div className={`text-sm font-medium ${day === new Date().getDate() ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto' : 'text-slate-700'}`}>
                  {day}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {monthTickets.map(ticket => {
            const style = getTicketStyle(ticket);
            if (!style) return null;

            return (
              <div key={ticket.id} className="grid grid-cols-[200px_1fr] gap-4 group hover:bg-slate-50 rounded-lg transition-colors">
                <div className="py-2 pl-2 pr-4 flex items-center gap-3 border-r border-slate-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${ticket.priority === 'P1' ? 'bg-rose-100 text-rose-700' : 
                      ticket.priority === 'P2' ? 'bg-amber-100 text-amber-700' : 
                      'bg-blue-100 text-blue-700'}`}
                  >
                    {ticket.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{ticket.issue}</div>
                    <div className="text-xs text-slate-500 truncate">#{ticket.id.substring(0, 8)}</div>
                  </div>
                </div>
                
                <div className="grid relative py-2 items-center" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
                  {/* Grid lines */}
                  {days.map(day => (
                    <div key={day} className="border-l border-slate-100 h-full absolute top-0 bottom-0" style={{ left: `${(day - 1) * (100 / daysInMonth)}%` }} />
                  ))}
                  
                  {/* Bar */}
                  <div 
                    style={{ 
                      gridColumnStart: style.gridColumnStart, 
                      gridColumnEnd: style.gridColumnEnd 
                    }}
                    className={style.className}
                  >
                    {/* Label outside */}
                    <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-slate-600 z-10">
                      {ticket.issue}
                    </span>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-48 bg-slate-900 text-white text-xs rounded p-2 shadow-xl">
                      <div className="font-medium mb-1">{ticket.issue}</div>
                      <div className="text-slate-300">Status: {ticket.status}</div>
                      <div className="text-slate-300">Priority: {ticket.priority}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
