export const getStatusColor = (status: string) => {
  const colors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    PENDING: 'warning',
    ACKNOWLEDGED: 'info',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    ESCALATED: 'danger',
    CLOSED: 'default',
    INVOICE: 'default',
    PAID: 'default',
  };
  return colors[status] || 'default';
};

export const getPriorityColor = (priority: string) => {
  const colors: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'success',
    P1: 'danger',
    P2: 'warning',
    P3: 'success',
  };
  return colors[priority] || 'default';
};

export const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    P1: 'P1 - Within 4 Hours',
    P2: 'P2 - Next Working Day',
    P3: 'P3 - Within 48 Hours',
  };
  return labels[priority] || priority;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(dateString);
};
