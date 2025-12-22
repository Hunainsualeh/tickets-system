

interface WelcomeEmailProps {
  username: string;
  role: string;
  loginUrl: string;
}

export function generateWelcomeEmailHtml({ username, role, loginUrl }: WelcomeEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ticket System</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .subtitle { color: #6b7280; font-size: 16px; }
    .info-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .label { color: #6b7280; font-size: 14px; }
    .value { color: #111827; font-weight: 600; font-size: 14px; }
    .button { display: block; width: 100%; background-color: #1e40af; color: #ffffff !important; text-align: center; padding: 14px 0; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 24px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1 class="title">Welcome on board!</h1>
        <p class="subtitle">Your account has been successfully created.</p>
      </div>
      
      <p>Hello ${username},</p>
      <p>Welcome to the Ticket System. You have been granted access with the following details:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Username</span>
          <span class="value">${username}</span>
        </div>
        <div class="info-row">
          <span class="label">Role</span>
          <span class="value">${role}</span>
        </div>
      </div>
      
      <p>You can now log in to your account and start using the system.</p>
      
      <a href="${loginUrl}" class="button">Log In to Dashboard</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Ticket System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

interface NewUserAdminEmailProps {
  username: string;
  email: string;
  role: string;
  adminUrl: string;
}

export function generateNewUserAdminEmailHtml({ username, email, role, adminUrl }: NewUserAdminEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New User Created</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #2563eb; }
    .title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; }
    .info-list { list-style: none; padding: 0; margin: 0; }
    .info-item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
    .info-item:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 14px; }
    .value { color: #111827; font-weight: 600; font-size: 14px; }
    .button { display: inline-block; background-color: #f3f4f6; color: #374151; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 20px; }
    .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="title">New User Registration</h1>
      <p>A new user account has been created in the system.</p>
      
      <div class="info-list">
        <div class="info-item">
          <span class="label">Username</span>
          <span class="value">${username}</span>
        </div>
        <div class="info-item">
          <span class="label">Email</span>
          <span class="value">${email || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="label">Role</span>
          <span class="value">${role}</span>
        </div>
      </div>
      
      <a href="${adminUrl}" class="button">Manage Users</a>
    </div>
    <div class="footer">
      <p>Ticket System Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `;
}

interface UserUpdatedEmailProps {
  username: string;
  email: string;
  role: string;
  changes?: string[];
  adminUrl: string;
}

export function generateUserUpdatedEmailHtml({ username, email, role, changes, adminUrl }: UserUpdatedEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Updated</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #f59e0b; }
    .title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; }
    .info-list { list-style: none; padding: 0; margin: 0; }
    .info-item { padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
    .info-item:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 14px; }
    .value { color: #111827; font-weight: 600; font-size: 14px; }
    .changes-box { background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .changes-title { color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
    .changes-list { margin: 0; padding-left: 20px; color: #b45309; font-size: 14px; }
    .button { display: inline-block; background-color: #f3f4f6; color: #374151; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 20px; }
    .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="title">User Profile Updated</h1>
      <p>A user account has been updated in the system.</p>
      
      <div class="info-list">
        <div class="info-item">
          <span class="label">Username</span>
          <span class="value">${username}</span>
        </div>
        <div class="info-item">
          <span class="label">Email</span>
          <span class="value">${email || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="label">Current Role</span>
          <span class="value">${role}</span>
        </div>
      </div>

      ${changes && changes.length > 0 ? `
      <div class="changes-box">
        <div class="changes-title">Updates Made:</div>
        <ul class="changes-list">
          ${changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      <a href="${adminUrl}" class="button">Manage Users</a>
    </div>
    <div class="footer">
      <p>Ticket System Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `;
}

interface NewRequestEmailProps {
  title: string;
  description: string;
  username: string;
  projectId?: string;
  requestId: string;
  requestUrl: string;
}

export function generateNewRequestEmailHtml({ title, description, username, projectId, requestId, requestUrl }: NewRequestEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Request Created</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 16px; padding: 0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background-color: #4f46e5; padding: 32px; text-align: center; }
    .header-title { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; }
    .header-subtitle { color: #e0e7ff; font-size: 14px; margin-top: 8px; }
    .content { padding: 32px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 24px; }
    .meta-item { flex: 1; }
    .meta-label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 4px; }
    .meta-value { color: #111827; font-weight: 600; font-size: 14px; }
    .section-title { color: #374151; font-weight: 700; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .description-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .button { display: block; width: 100%; background-color: #4f46e5; color: #ffffff !important; text-align: center; padding: 14px 0; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; transition: background-color 0.2s; }
    .button:hover { background-color: #4338ca; }
    .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 8px; background-color: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1 class="header-title">New Request</h1>
        <p class="header-subtitle">Submitted by ${username}</p>
      </div>
      
      <div class="content">
        <div class="meta-row">
          <div class="meta-item">
            <div class="meta-label">Request ID</div>
            <div class="meta-value">#${requestId.slice(-6).toUpperCase()}</div>
          </div>
          <div class="meta-item" style="text-align: right;">
            <div class="meta-label">Project</div>
            <div class="meta-value">${projectId ? `<span class="badge">${projectId}</span>` : 'N/A'}</div>
          </div>
        </div>

        <div class="section-title">Title</div>
        <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 24px;">${title}</div>

        <div class="section-title">Description</div>
        <div class="description-box">
          ${description.replace(/\n/g, '<br>')}
        </div>

        <a href="${requestUrl}" class="button">View Request Details</a>
      </div>
    </div>
    <div class="footer">
      <p>Ticket System Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `;
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return '#2563eb'; // blue-600
    case 'PENDING': return '#d97706'; // amber-600
    case 'IN_PROGRESS': return '#7c3aed'; // violet-600
    case 'COMPLETED': return '#16a34a'; // green-600
    case 'CLOSED': return '#475569'; // slate-600
    case 'ESCALATED': return '#dc2626'; // red-600
    case 'ACKNOWLEDGED': return '#0284c7'; // sky-600
    case 'INVOICE': return '#ea580c'; // orange-600
    case 'PAID': return '#059669'; // emerald-600
    default: return '#4b5563'; // gray-600
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH': return '#dc2626'; // red-600
    case 'MEDIUM': return '#d97706'; // amber-600
    case 'LOW': return '#16a34a'; // green-600
    default: return '#4b5563'; // gray-600
  }
};

interface TicketEmailProps {
  headline: string;
  recipientName: string;
  message: string;
  ticket: {
    id: string;
    issue: string;
    status: string;
    priority: string;
    createdAt: Date | string;
    assignedTo?: { username: string } | null;
    branch?: { name: string } | null;
    additionalDetails?: string | null;
  };
  notes?: string;
  link: string;
}

export function generateTicketEmailHtml({
  headline,
  recipientName,
  message,
  ticket,
  notes,
  link
}: TicketEmailProps): string {
  const statusColor = getStatusColor(ticket.status);
  const priorityColor = getPriorityColor(ticket.priority);
  const dateOpened = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    /* The entire card is now the ticket */
    .ticket-wrapper {
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      border: 1px solid #e5e7eb;
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }
    .ticket-main {
      padding: 32px;
      vertical-align: top;
      background-color: #ffffff;
      width: 70%;
    }
    .ticket-stub {
      width: 30%;
      padding: 32px;
      vertical-align: top;
      background-color: #f8fafc;
      border-left: 2px dashed #cbd5e1;
      text-align: center;
      position: relative;
    }
    
    /* Responsive Styles */
    @media only screen and (max-width: 600px) {
      .ticket-main, .ticket-stub {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .ticket-stub {
        border-left: none !important;
        border-top: 2px dashed #cbd5e1 !important;
        padding-top: 32px !important;
      }
    }

    .header-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: #1e293b;
    }
    .bank-name {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 24px;
      display: block;
    }
    
    .greeting {
      font-size: 16px;
      margin-bottom: 16px;
      font-weight: 600;
      color: #111827;
    }
    .message {
      margin-bottom: 24px;
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
    }
    
    .details-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      margin-bottom: 24px;
    }
    .detail-cell {
      padding-bottom: 16px;
      vertical-align: top;
    }
    .detail-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .detail-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 600;
    }
    
    .ticket-id-box {
      background-color: #e2e8f0;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-weight: 700;
      color: #475569;
      font-size: 16px;
      margin-bottom: 24px;
      display: inline-block;
      letter-spacing: 0.05em;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
      background-color: ${statusColor};
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    
    .priority-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: ${priorityColor};
      margin-right: 6px;
    }
    
    .notes-section {
      background-color: #fff7ed;
      border: 1px solid #fed7aa;
      border-left: 4px solid #f97316;
      padding: 16px;
      margin-top: 24px;
      border-radius: 6px;
    }
    .notes-title {
      font-weight: 700;
      color: #9a3412;
      margin-bottom: 8px;
      font-size: 13px;
      text-transform: uppercase;
    }
    .notes-content {
      color: #7c2d12;
      font-size: 14px;
      white-space: pre-wrap;
    }

    .button {
      display: block;
      background-color: #1e40af;
      color: #ffffff !important;
      padding: 14px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      transition: all 0.2s;
      text-align: center;
      margin-top: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .button:hover {
      background-color: #1e3a8a;
    }
    
    .footer {
      text-align: center;
      padding-top: 32px;
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- The Entire Card is the Ticket -->
    <table class="ticket-wrapper">
      <tr>
        <!-- Main Ticket Body -->
        <td class="ticket-main">
          <span class="bank-name">Valley National Bank</span>
          <h1 class="header-title">${headline}</h1>
          
          <div class="greeting">Hello ${recipientName},</div>
          <div class="message">${message}</div>
          
          <div style="border-top: 1px solid #e2e8f0; margin: 20px 0;"></div>
          
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 600;">Issue</div>
          <div style="font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 20px; line-height: 1.4;">${ticket.issue}</div>
          
          <table class="details-grid">
            <tr>
              <td class="detail-cell" width="50%">
                <div class="detail-label">Priority</div>
                <div class="detail-value" style="display: flex; align-items: center;">
                  <span class="priority-dot"></span>${ticket.priority}
                </div>
              </td>
              <td class="detail-cell" width="50%">
                <div class="detail-label">Branch</div>
                <div class="detail-value">${ticket.branch?.name || 'N/A'}</div>
              </td>
            </tr>
            ${ticket.assignedTo ? `
            <tr>
              <td class="detail-cell" colspan="2">
                <div class="detail-label">Assigned Officer</div>
                <div class="detail-value">${ticket.assignedTo.username}</div>
              </td>
            </tr>
            ` : ''}
          </table>
          
          ${ticket.additionalDetails ? `
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div class="detail-label">Details</div>
            <div style="color: #475569; font-size: 14px; line-height: 1.5;">${ticket.additionalDetails}</div>
          </div>
          ` : ''}

          ${notes ? `
          <div class="notes-section">
            <div class="notes-title">Notes</div>
            <div class="notes-content">${notes}</div>
          </div>
          ` : ''}
        </td>
        
        <!-- Ticket Stub -->
        <td class="ticket-stub">
          <div class="detail-label" style="margin-bottom: 8px;">Ticket ID</div>
          <div class="ticket-id-box">#${ticket.id.slice(-6).toUpperCase()}</div>
          
          <div style="margin-bottom: 32px;">
             <span class="status-badge">${ticket.status}</span>
          </div>
          
          <div class="detail-label">Date Opened</div>
          <div class="detail-value" style="margin-bottom: 32px;">${dateOpened}</div>
          
          <a href="${link}" class="button">View Ticket</a>
        </td>
      </tr>
    </table>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Valley National Bank. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}
