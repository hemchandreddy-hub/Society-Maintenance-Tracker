const nodemailer = require('nodemailer');

let transporter = null;
let etherealAccount = null;

/**
 * Initialize the email transporter with Ethereal test credentials.
 * Ethereal captures all sent emails in a web interface for viewing.
 */
async function initEmail() {
  try {
    etherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });

    console.log('   Email service initialized (Ethereal Test SMTP)');
    console.log(`   View sent emails: https://ethereal.email/login`);
    console.log(`   Ethereal user: ${etherealAccount.user}`);
    console.log(`   Ethereal pass: ${etherealAccount.pass}`);
    return true;
  } catch (err) {
    console.warn('  Email service failed to initialize:', err.message);
    console.warn('   Email notifications will be logged to console instead.');
    return false;
  }
}

/**
 * Send an email and log the Ethereal preview URL
 */
async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    console.log(` [Email Mock] To: ${to} | Subject: ${subject}`);
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Society Maintenance" <noreply@society.com>',
      to,
      subject,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(` Email sent to ${to}: ${previewUrl}`);
    return previewUrl;
  } catch (err) {
    console.error(` Email failed for ${to}:`, err.message);
    return null;
  }
}

/**
 * Send complaint status change notification to the resident
 */
async function sendStatusChangeEmail({ residentEmail, residentName, complaintTitle, oldStatus, newStatus, note }) {
  const statusColors = {
    'Open': '#3b82f6',
    'In Progress': '#f59e0b',
    'Resolved': '#10b981',
  };

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e3a5f, #0f172a); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: #3b82f6;"> Society Maintenance Tracker</h1>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px;">Hi ${residentName},</p>
        <p style="margin: 0 0 16px;">Your complaint <strong>"${complaintTitle}"</strong> has been updated:</p>
        <div style="display: flex; align-items: center; gap: 12px; margin: 24px 0;">
          <span style="background: ${statusColors[oldStatus] || '#64748b'}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px;">${oldStatus}</span>
          <span style="color: #64748b; font-size: 18px;">→</span>
          <span style="background: ${statusColors[newStatus] || '#64748b'}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">${newStatus}</span>
        </div>
        ${note ? `<p style="margin: 16px 0; padding: 12px 16px; background: #1e293b; border-left: 3px solid #3b82f6; border-radius: 4px; font-style: italic;">${note}</p>` : ''}
        ${newStatus === 'Resolved' ? '<p style="margin: 16px 0; color: #10b981; font-weight: 600;">✅ Your complaint has been resolved and closed.</p>' : ''}
        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px;">This is an automated notification from the Society Maintenance Tracker.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: residentEmail,
    subject: `Complaint Update: "${complaintTitle}" — ${newStatus}`,
    html,
  });
}

/**
 * Send important notice notification to a resident
 */
async function sendNoticeEmail({ residentEmail, residentName, noticeTitle, noticeContent }) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #92400e, #0f172a); padding: 24px 32px;">
        <h1 style="margin: 0; font-size: 20px; color: #f59e0b;"> Important Notice</h1>
      </div>
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px;">Hi ${residentName},</p>
        <p style="margin: 0 0 8px;">An important notice has been posted:</p>
        <div style="margin: 20px 0; padding: 20px; background: #1e293b; border-radius: 8px; border: 1px solid #f59e0b33;">
          <h2 style="margin: 0 0 12px; color: #f59e0b; font-size: 18px;">${noticeTitle}</h2>
          <p style="margin: 0; line-height: 1.6;">${noticeContent}</p>
        </div>
        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 13px;">This is an automated notification from the Society Maintenance Tracker.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: residentEmail,
    subject: ` Important: ${noticeTitle}`,
    html,
  });
}

module.exports = { initEmail, sendEmail, sendStatusChangeEmail, sendNoticeEmail };
