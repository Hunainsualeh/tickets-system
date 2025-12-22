
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  // Dynamic imports to ensure env vars are loaded first
  const { prisma } = await import('../src/lib/prisma');
  const { sendAdminNotification } = await import('../src/lib/email');
  const { generateTicketEmailHtml } = await import('../src/lib/email-templates');

  console.log('--- Simulating Ticket Creation & Notification ---');

  // 1. Get Admin User
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (!admin) throw new Error('Admin user not found');

  // 2. Get a Branch
  const branch = await prisma.branch.findFirst();
  if (!branch) throw new Error('No branches found. Seed the database first.');

  // 3. Create Ticket
  console.log('Creating dummy ticket...');
  const ticket = await prisma.ticket.create({
    data: {
      userId: admin.id,
      branchId: branch.id,
      priority: 'P1',
      issue: 'Test Ticket for Email Notification',
      additionalDetails: 'This is a dummy ticket created to test email notifications.',
      status: 'PENDING',
      localContactName: 'Test User',
      localContactEmail: 'test@example.com',
    },
    include: {
      user: true,
      branch: true
    }
  });

  console.log(`Ticket created: #${ticket.id} - ${ticket.issue}`);

  // 4. Trigger Notification (Mimicking API logic)
  console.log('Triggering Admin Notification...');
  
  const subject = `New Ticket Created: ${ticket.issue}`;
  const text = `A new ticket has been created by ${ticket.user.username}.\n\n` +
      `Priority: ${ticket.priority}\n` +
      `Issue: ${ticket.issue}\n` +
      `Details: ${ticket.additionalDetails || 'N/A'}\n` +
      `Branch: ${ticket.branch.name}\n` +
      `Link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}`;

  const html = generateTicketEmailHtml({
    headline: 'New Ticket Created',
    recipientName: 'Admin',
    message: `A new ticket has been created by ${ticket.user.username}.`,
    ticket: {
      id: ticket.id,
      issue: ticket.issue,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      assignedTo: null,
      branch: ticket.branch,
      additionalDetails: ticket.additionalDetails,
    },
    link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}`
  });

  await sendAdminNotification(subject, text, html);
  
  console.log('--- Simulation Complete ---');
  await prisma.$disconnect();
}

main()
  .catch(e => console.error(e));
