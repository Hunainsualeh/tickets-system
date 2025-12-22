
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  // If credentials are not set, log a warning and return (to prevent crashes in dev)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials not found. Email notification skipped.");
    console.log(`[Mock Email] To: ${to}, Subject: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Ticket System" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>'),
    });

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

export async function sendAdminNotification(subject: string, text: string, html?: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    const adminEmails = admins
      .map(admin => admin.email)
      .filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      console.warn("No admin emails found. Email notification skipped.");
      return;
    }

    // Send to all admins
    const promises = adminEmails.map(email => sendEmail(email, subject, text, html));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error sending admin notifications:", error);
  }
}
