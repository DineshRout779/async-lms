const nodemailer = require('nodemailer');

/**
 * Sends transactional email via SMTP (Resend/Brevo/SES)
 * If SMTP environment variables are missing and NODE_ENV is development,
 * it gracefully falls back to logging the mail and OTP code to the console.
 */
const sendMail = async ({ to, subject, html, text }) => {
  const isDev = (process.env.NODE_ENV || 'development').trim() === 'development';
  
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  const isSmtpConfigured = host && user && pass;

  if (!isSmtpConfigured) {
    if (isDev) {
      console.log('\n==================================================');
      console.log(`✉️  [DEV MAIL FALLBACK]`);
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:    ${text || 'HTML content (see below)'}`);
      if (html) {
        console.log(`--------------------------------------------------`);
        console.log(html);
      }
      console.log('==================================================\n');

      // Write code to a local file for automated verification/testing
      try {
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, '../otp_log.txt'), text || '');
      } catch (err) {
        console.error('Failed to write local otp_log.txt:', err);
      }

      return { success: true, message: 'Logged to console' };
    } else {
      throw new Error('SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS) is missing in production!');
    }
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465, false for other ports (like 587)
    auth: {
      user,
      pass,
    },
  });

  // Resend free sandbox requires sending from onboarding@resend.dev
  let fromEmail = user;
  if (host.includes('resend.com')) {
    fromEmail = 'onboarding@resend.dev';
  }
  if (process.env.SMTP_FROM) {
    fromEmail = process.env.SMTP_FROM;
  }

  const mailOptions = {
    from: `"CodeGuru" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[mailer] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[mailer] Failed to send email:', error);
    throw error;
  }
};

module.exports = { sendMail };
