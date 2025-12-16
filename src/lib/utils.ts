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

export const formatDateInTimezone = (dateString: string, timezone: string) => {
  try {
    const date = new Date(dateString);
    // Map common abbreviations to IANA timezones if needed, or assume valid IANA strings
    // For this specific app, the dropdown values are abbreviations like 'EST', 'CST', etc.
    // These are not valid IANA timezones for Intl.DateTimeFormat in all browsers.
    // We should map them.
    
    const timezoneMap: Record<string, string> = {
      'EST': 'America/New_York',
      'CST': 'America/Chicago',
      'MST': 'America/Denver',
      'PST': 'America/Los_Angeles',
      'AST': 'America/Anchorage',
      'HST': 'Pacific/Honolulu',
    };

    const ianaTimezone = timezoneMap[timezone] || timezone;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: ianaTimezone,
      timeZoneName: 'short'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return formatDate(dateString); // Fallback to local time
  }
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
