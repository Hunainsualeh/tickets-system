export interface Team {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'USER';
  teamId?: string | null;
  createdAt: string;
  updatedAt: string;
  team?: Team;
  _count?: {
    tickets: number;
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
  incNumber?: string | null;
  priority: 'P1' | 'P2' | 'P3';
  issue: string;
  additionalDetails?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'CLOSED' | 'INVOICE' | 'PAID';
  createdAt: string;
  updatedAt: string;
  user?: User;
  branch?: Branch;
  statusHistory?: StatusHistory[];
  attachments?: Attachment[];
  notes?: TicketNote[];
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

export interface AuthResponse {
  token: string;
  user: User;
}
