export interface Team {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

export interface UserTeam {
  id: string;
  userId: string;
  teamId: string;
  createdAt: string;
  team?: Team;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'DEVELOPER' | 'TECHNICAL';
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
  team?: Team;
  teams?: UserTeam[];
  _count?: {
    tickets: number;
    assignedTickets?: number;
  };
}

export interface Branch {
  id: string;
  name: string;
  branchNumber: string;
  category: 'BRANCH' | 'BACK_OFFICE' | 'HYBRID' | 'DATA_CENTER';
  createdAt: string;
  updatedAt: string;
}

export interface TicketNote {
  id: string;
  ticketId: string;
  userId: string;
  note: string;
  createdAt: string;
  user?: User;
  ticket?: Ticket;
}

export interface Ticket {
  id: string;
  userId: string;
  branchId: string;
  teamId?: string | null;
  incNumber?: string | null;
  priority: 'P1' | 'P2' | 'P3';
  issue: string;
  additionalDetails?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'CLOSED' | 'INVOICE' | 'PAID';
  createdAt: string;
  updatedAt: string;
  user?: User;
  branch?: Branch;
  team?: Team;
  statusHistory?: StatusHistory[];
  attachments?: Attachment[];
  notes?: TicketNote[];
  localContactName?: string | null;
  localContactEmail?: string | null;
  localContactPhone?: string | null;
  timezone?: string | null;
  assignedToUserId?: string | null;
  assignedTo?: User | null;
  assignedToUser?: User | null;
}

export interface StatusHistory {
  id: string;
  ticketId: string;
  status: string;
  note?: string;
  adminNote?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface RequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Request {
  id: string;
  userId: string;
  title: string;
  description: string;
  projectId?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  user?: User;
  attachments?: RequestAttachment[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
