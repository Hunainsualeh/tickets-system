'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastContainer';
import { apiClient } from '@/lib/api-client';
import { Ticket, StatusHistory, TicketNote } from '@/types';
import { Badge } from '@/app/components/Badge';
import { getStatusColor, getPriorityColor, getPriorityLabel, formatDate, formatRelativeTime } from '@/lib/utils';
import { 
  ArrowLeft, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  FileText, 
  X,
  MapPin,
  Send,
  Ticket as TicketIcon,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'CREATED' | 'STATUS_CHANGE' | 'NOTE_ADDED' | 'ATTACHMENT_ADDED';
  date: string;
  title: string;
  description?: string;
  adminNote?: string;
  user?: {
    username: string;
    role: string;
    team?: { name: string };
  };
  data: any;
  // Visual coordinates
  x?: number;
  y?: number;
}

export default function TicketTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  
  // Canvas State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const { ticket } = await apiClient.getTicket(params.id as string);
      setTicket(ticket);
      
      // Process events
      const timelineEvents: TimelineEvent[] = [];

      // 1. Creation Event
      timelineEvents.push({
        id: 'created',
        type: 'CREATED',
        date: ticket.createdAt,
        title: 'Ticket Created',
        description: ticket.issue,
        user: ticket.user,
        data: ticket
      });

      // 2. Status History
      if (ticket.statusHistory) {
        ticket.statusHistory.forEach((history: StatusHistory) => {
          const isCreation = Math.abs(new Date(history.createdAt).getTime() - new Date(ticket.createdAt).getTime()) < 1000;
          if (!isCreation) {
            timelineEvents.push({
              id: history.id,
              type: 'STATUS_CHANGE',
              date: history.createdAt,
              title: `Status: ${history.status.replace('_', ' ')}`,
              description: history.note,
              adminNote: history.adminNote,
              user: undefined,
              data: history
            });
          }
        });
      }

      // 3. Notes
      if (ticket.notes) {
        ticket.notes.forEach((note: TicketNote) => {
          timelineEvents.push({
            id: note.id,
            type: 'NOTE_ADDED',
            date: note.createdAt,
            title: 'Note Added',
            description: note.note,
            user: note.user,
            data: note
          });
        });
      }

      // Sort by date
      timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate Positions
      const processedEvents = timelineEvents.map((event, index) => {
        // Base spacing
        const xBase = 100 + (index * 350);
        // Alternating Y for organic feel, but keep Ticket (index 0) centered
        let yBase = 300;
        
        if (index > 0) {
          // Randomize slightly or alternate
          const offset = (index % 2 === 0) ? 50 : -50;
          yBase += offset;
        }

        return {
          ...event,
          x: xBase,
          y: yBase
        };
      });

      setEvents(processedEvents);
      
      // Center view on the last event initially
      if (processedEvents.length > 0) {
        // Simple initial centering logic could go here
      }

    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchTicket();
    }
  }, [params.id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setSubmittingNote(true);
    try {
      await apiClient.addNote(params.id as string, newNote);
      toast.success('Note added successfully');
      setNewNote('');
      setIsAddNoteOpen(false);
      fetchTicket(); // Refresh timeline
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Canvas Interaction Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      // Zoom
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.5, transform.scale + delta), 2);
      setTransform(prev => ({ ...prev, scale: newScale }));
    } else {
      // Pan
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate SVG Path for connectors
  const generateConnectorPath = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    const controlPointOffset = 150;
    const cp1x = start.x + controlPointOffset;
    const cp1y = start.y;
    const cp2x = end.x - controlPointOffset;
    const cp2y = end.y;
    
    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
  };

  // Status Color Styles
  const statusStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 z-30 shadow-sm gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex-1 sm:flex-none">
            <h1 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="whitespace-nowrap">Ticket #{ticket.incNumber || ticket.id.substring(0, 8)}</span>
              <div className="flex gap-2">
                <div className={`inline-flex items-center justify-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold border-2 bg-white ${
                  ticket.priority === 'P1' ? 'text-red-600 border-red-600' :
                  ticket.priority === 'P2' ? 'text-amber-600 border-amber-600' :
                  'text-green-600 border-green-600'
                }`}>
                  <span className="hidden sm:inline">{getPriorityLabel(ticket.priority)}</span>
                  <span className="sm:hidden">{ticket.priority}</span>
                </div>
                <Badge variant={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
              </div>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - 0.1) }))}
              className="p-1.5 hover:bg-white rounded-md transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-medium text-slate-600 w-12 text-center">
              {Math.round(transform.scale * 100)}%
            </span>
            <button 
              onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(2, prev.scale + 0.1) }))}
              className="p-1.5 hover:bg-white rounded-md transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          <button 
            onClick={() => setIsAddNoteOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4" />
            Add Note
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
        
        {/* Canvas Container */}
        <div 
          className={`w-full h-full cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing' : ''}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            // Basic touch support for dragging
            const touch = e.touches[0];
            setIsDragging(true);
            setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
          }}
          onTouchMove={(e) => {
            if (isDragging) {
              const touch = e.touches[0];
              setTransform(prev => ({
                ...prev,
                x: touch.clientX - dragStart.x,
                y: touch.clientY - dragStart.y
              }));
            }
          }}
          onTouchEnd={() => setIsDragging(false)}
          ref={containerRef}
        >
          {/* Dot Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
              backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
              backgroundPosition: `${transform.x}px ${transform.y}px`
            }}
          />

          {/* Transform Layer */}
          <div 
            className="absolute left-0 top-0 origin-top-left transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
            }}
          >
            {/* SVG Connectors Layer */}
            <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
              {events.map((event, index) => {
                if (index === events.length - 1) return null;
                const nextEvent = events[index + 1];
                if (!event.x || !event.y || !nextEvent.x || !nextEvent.y) return null;

                return (
                  <path
                    key={`conn-${event.id}`}
                    d={generateConnectorPath({x: event.x, y: event.y}, {x: nextEvent.x, y: nextEvent.y})}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="animate-[dash_30s_linear_infinite]"
                  />
                );
              })}
            </svg>

            {/* Nodes Layer */}
            {events.map((event) => {
              const isSelected = selectedEvent?.id === event.id;
              if (!event.x || !event.y) return null;

              return (
                <div
                  key={event.id}
                  className="absolute"
                  style={{
                    left: event.x,
                    top: event.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* EVENT TYPE: TICKET CREATED */}
                  {event.type === 'CREATED' && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      className={`
                        relative w-72 bg-[#FFC107] rounded-2xl p-5 text-left transition-all duration-300 shadow-lg cursor-pointer
                        ${isSelected ? 'ring-4 ring-blue-500/30 scale-105 z-20' : 'hover:scale-105 z-10'}
                      `}
                    >
                      {/* Ticket Stub Notches */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full" />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full" />
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-black/10 p-2 rounded-xl backdrop-blur-sm">
                          <TicketIcon className="w-6 h-6 text-slate-900" />
                        </div>
                        <div className="bg-white/90 px-2 py-1 rounded-md shadow-sm">
                          <span className="text-xs font-bold text-slate-900">#{ticket.incNumber}</span>
                        </div>
                      </div>
                      
                      <h3 className="text-slate-900 font-bold text-lg leading-tight mb-2">
                        Ticket Created
                      </h3>
                      <p className="text-slate-800/80 text-sm mb-4 line-clamp-2 font-medium">
                        {event.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-slate-800/70 text-xs font-medium border-t border-black/5 pt-3">
                        <Clock className="w-3 h-3" />
                        {formatDate(event.date)}
                      </div>
                    </div>
                  )}

                  {/* EVENT TYPE: STATUS CHANGE */}
                  {event.type === 'STATUS_CHANGE' && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      className={`
                        flex flex-col items-center cursor-pointer group
                        ${isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'}
                      `}
                    >
                      <div className={`
                        px-4 py-2 rounded-full text-xs font-bold shadow-sm mb-3 whitespace-nowrap border-2
                        ${statusStyles[getStatusColor(event.data.status)]}
                        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                      `}>
                        {event.data.status.replace('_', ' ')}
                      </div>
                      
                      <div className={`
                        w-5 h-5 rounded-full border-4 z-10 transition-colors bg-white
                        ${isSelected ? 'border-blue-500' : 'border-slate-300'}
                      `} />
                      
                      <div className="mt-3 text-xs text-slate-400 font-medium bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm">
                        {formatRelativeTime(event.date)}
                      </div>
                    </div>
                  )}

                  {/* EVENT TYPE: NOTE ADDED */}
                  {event.type === 'NOTE_ADDED' && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      className={`
                        relative w-80 cursor-pointer transition-all duration-300 group
                        ${isSelected ? 'scale-105 z-20' : 'hover:scale-105 z-10'}
                      `}
                    >
                      <div className={`
                        bg-white rounded-2xl p-4 shadow-md border transition-all text-left relative
                        ${isSelected ? 'border-blue-500 shadow-blue-100' : 'border-slate-200 hover:border-slate-300'}
                      `}>
                        {/* Chat Bubble Tail */}
                        <div className={`
                          absolute -bottom-2 left-8 w-4 h-4 bg-white border-b border-r transform rotate-45
                          ${isSelected ? 'border-blue-500' : 'border-slate-200 group-hover:border-slate-300'}
                        `} />

                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm border border-purple-200">
                            {event.user?.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{event.user?.username}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                              {event.user?.team?.name || 'Support Team'}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                      
                      <div className="mt-4 ml-8 text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(event.date)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar Details */}
        <div className={`
          fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col z-40
          ${selectedEvent ? 'translate-x-0' : 'translate-x-full'}
        `}>
          {selectedEvent && (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">{selectedEvent.title}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatDate(selectedEvent.date)}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Description / Note Content */}
                {(selectedEvent.description || selectedEvent.adminNote) && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Content</h3>
                    {selectedEvent.description && (
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm mb-2">
                        {selectedEvent.description}
                      </p>
                    )}
                    {selectedEvent.adminNote && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 block">Admin Note</span>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm italic">
                          {selectedEvent.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* User Info */}
                {selectedEvent.user && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Activity By</h3>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {selectedEvent.user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{selectedEvent.user.username}</p>
                        <p className="text-xs text-slate-500">{selectedEvent.user.team?.name || selectedEvent.user.role}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Context Data based on type */}
                {selectedEvent.type === 'CREATED' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ticket Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 mb-1">Priority</p>
                          <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold border-2 bg-white ${
                            ticket.priority === 'P1' ? 'text-red-600 border-red-600' :
                            ticket.priority === 'P2' ? 'text-amber-600 border-amber-600' :
                            'text-green-600 border-green-600'
                          }`}>
                            {getPriorityLabel(ticket.priority)}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 mb-1">Branch</p>
                          <p className="font-medium text-slate-900 text-sm">{ticket.branch?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Note Modal */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Add Note</h3>
              <button onClick={() => setIsAddNoteOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type your note here..."
                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-slate-700"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddNoteOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddNote}
                  disabled={submittingNote || !newNote.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingNote ? 'Adding...' : (
                    <>
                      <Send className="w-4 h-4" />
                      Add Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}