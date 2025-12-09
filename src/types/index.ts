export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
  _count?: {
    tickets: number;
  };
}

export interface Branch {
  id: string;
  name: string;
  branchNumber: string;
  address: string;
  localContact: string;
  category: 'BRANCH' | 'BACK_OFFICE' | 'HYBRID' | 'DATA_CENTER';
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  branchId: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string;
  additionalDetails?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  user?: User;
  branch?: Branch;
  statusHistory?: StatusHistory[];
  attachments?: Attachment[];
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

export interface AuthResponse {
  token: string;
  user: User;
}
