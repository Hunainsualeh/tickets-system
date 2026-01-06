
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- Email Template Helpers ---
const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return '#2563eb';
    case 'PENDING': return '#d97706';
    case 'IN_PROGRESS': return '#7c3aed';
    case 'COMPLETED': return '#16a34a';
    case 'CLOSED': return '#475569';
    case 'ESCALATED': return '#dc2626';
    case 'ACKNOWLEDGED': return '#0284c7';
    case 'INVOICE': return '#ea580c';
    case 'PAID': return '#059669';
    default: return '#4b5563';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH': return '#dc2626';
    case 'MEDIUM': return '#d97706';
    case 'LOW': return '#16a34a';
    default: return '#4b5563';
  }
};

function generateTicketEmailHtml({
  headline,
  recipientName,
  message,
  ticket,
  notes,
  link
}: any): string {
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .ticket-wrapper { background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e5e7eb; width: 100%; border-collapse: separate; border-spacing: 0; }
    .ticket-main { padding: 32px; vertical-align: top; background-color: #ffffff; width: 70%; }
    .ticket-stub { width: 30%; padding: 32px; vertical-align: top; background-color: #f8fafc; border-left: 2px dashed #cbd5e1; text-align: center; position: relative; }
    @media only screen and (max-width: 600px) { .ticket-main, .ticket-stub { display: block !important; width: 100% !important; box-sizing: border-box !important; } .ticket-stub { border-left: none !important; border-top: 2px dashed #cbd5e1 !important; padding-top: 32px !important; } }
    .header-title { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #1e293b; }
    .bank-name { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700; margin-bottom: 24px; display: block; }
    .greeting { font-size: 16px; margin-bottom: 16px; font-weight: 600; color: #111827; }
    .message { margin-bottom: 24px; color: #4b5563; font-size: 15px; line-height: 1.6; }
    .details-grid { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 24px; }
    .detail-cell { padding-bottom: 16px; vertical-align: top; }
    .detail-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 600; }
    .detail-value { font-size: 14px; color: #1e293b; font-weight: 600; }
    .ticket-id-box { background-color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-family: 'Monaco', 'Consolas', monospace; font-weight: 700; color: #475569; font-size: 16px; margin-bottom: 24px; display: inline-block; letter-spacing: 0.05em; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; background-color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; }
    .priority-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${priorityColor}; margin-right: 6px; }
    .notes-section { background-color: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; padding: 16px; margin-top: 24px; border-radius: 6px; }
    .notes-title { font-weight: 700; color: #9a3412; margin-bottom: 8px; font-size: 13px; text-transform: uppercase; }
    .notes-content { color: #7c2d12; font-size: 14px; white-space: pre-wrap; }
    .button { display: block; background-color: #1e40af; color: #ffffff !important; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; transition: all 0.2s; text-align: center; margin-top: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .button:hover { background-color: #1e3a8a; }
    .footer { text-align: center; padding-top: 32px; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <table class="ticket-wrapper">
      <tr>
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
                <div class="detail-value">${ticket.branch?.name || ticket.manualBranchName || 'N/A'}</div>
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
        <td class="ticket-stub">
          <div class="detail-label" style="margin-bottom: 8px;">Ticket ID</div>
          <div class="ticket-id-box">#${ticket.incNumber || ticket.id.slice(-6).toUpperCase()}</div>
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

// --- Main Logic ---

async function main() {
  const targetEmail = 'hunainsualeh8@gmail.com';
  
  // 1. Find the user
  const user = await prisma.user.findFirst({
    where: { email: targetEmail }
  });

  if (!user) {
    console.error('User not found!');
    return;
  }

  console.log(`Creating ticket for user: ${user.username}`);

  // 2. Create a ticket
  const ticket = await prisma.ticket.create({
    data: {
      userId: user.id,
      priority: 'P1',
      issue: 'Test Ticket for Email Verification',
      additionalDetails: 'This is a test ticket created to verify email notifications are working correctly.',
      status: 'PENDING',
      manualBranchName: 'Test Branch',
      incNumber: `TEST-${Date.now()}`,
    },
    include: {
      user: true,
      branch: true,
      assignedTo: true,
    }
  });

  console.log(`Ticket created: ${ticket.id}`);

  // 3. Send Email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const emailHtml = generateTicketEmailHtml({
    headline: 'New Ticket Created',
    recipientName: 'Admin',
    message: `A new ticket has been created by ${user.username}.`,
    ticket: {
      id: ticket.id,
      incNumber: ticket.incNumber,
      issue: ticket.issue,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      assignedTo: ticket.assignedTo,
      branch: ticket.branch,
      manualBranchName: ticket.manualBranchName,
      additionalDetails: ticket.additionalDetails,
    },
    link: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}`
  });

  console.log(`Sending email to ${targetEmail}...`);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: targetEmail,
      subject: `New Ticket Created: ${ticket.issue}`,
      html: emailHtml,
    });
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
