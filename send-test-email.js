require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
  const targetEmail = 'hunainsualeh8@gmail.com';
  
  console.log('Configuring transporter...');
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`SMTP User: ${process.env.SMTP_USER}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log(`Sending email to ${targetEmail}...`);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: targetEmail,
      subject: 'Test Email from Ticket System',
      text: 'This is a test email to verify the SMTP configuration is working correctly.',
      html: '<p>This is a <strong>test email</strong> to verify the SMTP configuration is working correctly.</p>',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

sendTestEmail();
