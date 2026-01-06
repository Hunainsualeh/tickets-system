require('dotenv').config();
const nodemailer = require('nodemailer');

async function verifyEmailConfig() {
  console.log('Checking email configuration...');
  console.log(`SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`SMTP User: ${process.env.SMTP_USER}`);
  
  if (!process.env.SMTP_PASS) {
    console.error('Error: SMTP_PASS is missing in .env file');
    return;
  }

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
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Try sending a test email to self
    console.log('Attempting to send test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to self
      subject: 'Test Email from Ticket System Debugger',
      text: 'If you receive this, email sending is working correctly.',
    });
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    if (error.code === 'EAUTH') {
      console.log('\nPossible causes:');
      console.log('1. Invalid email or password');
      console.log('2. If using Gmail, you might need an App Password');
      console.log('3. 2FA might be enabled requiring an App Password');
    }
  }
}

verifyEmailConfig();
