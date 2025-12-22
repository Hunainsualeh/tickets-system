const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('API Request Failed:', endpoint, error);
      throw new Error(error.details || error.error || 'Request failed');
    }

    return response.json();
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  // Auth
  async login(username: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, password: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Users
  async getUsers() {
    return this.request('/api/users');
  }

  async createUser(data: { username: string; password: string; role?: string; teamIds?: string[] }) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any) {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Branches
  async getBranches(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    return this.request(`/api/branches${queryString ? `?${queryString}` : ''}`);
  }

  async createBranch(data: any) {
    return this.request('/api/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBranch(id: string, data: any) {
    return this.request(`/api/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBranch(id: string) {
    return this.request(`/api/branches/${id}`, {
      method: 'DELETE',
    });
  }

  // Teams
  async getTeams() {
    return this.request('/api/teams');
  }

  async getTeam(id: string) {
    return this.request(`/api/teams/${id}`);
  }

  async createTeam(data: { name: string }) {
    return this.request('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: { name: string }) {
    return this.request(`/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request(`/api/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Tickets
  async getTickets(filters?: { status?: string; priority?: string; search?: string; scope?: string; teamId?: string; assignedToUserId?: string; userId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.assignedToUserId) params.append('assignedToUserId', filters.assignedToUserId);
    if (filters?.userId) params.append('userId', filters.userId);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/tickets${query}`);
  }

  async getTicket(id: string) {
    return this.request(`/api/tickets/${id}`);
  }

  async createTicket(data: any) {
    return this.request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTicket(id: string, data: any) {
    return this.request(`/api/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTicket(id: string) {
    return this.request(`/api/tickets/${id}`, {
      method: 'DELETE',
    });
  }

  async addNote(ticketId: string, note: string) {
    return this.request(`/api/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }
}

export const apiClient = new ApiClient(API_URL);
