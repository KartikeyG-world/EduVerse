const { getOtpEmailTemplate, getWelcomeEmailTemplate, getPasswordResetEmailTemplate } = require('../templates/emailTemplates');

/**
 * Send Brevo HTTP API Email
 */
const sendBrevoEmail = async (toEmail, subject, htmlContent) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();

  if (!apiKey || !senderEmail) {
    console.error("[BREVO] Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in environment variables");
    throw new Error("Email service not configured");
  }

  const payload = {
    sender: { name: "EduVerse AI", email: senderEmail },
    to: [{ email: toEmail }],
    subject: subject,
    htmlContent: htmlContent
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[BREVO] API Error response:", JSON.stringify(result));
      throw new Error(`Brevo API failed: ${result.message || response.status}`);
    }

    console.log(`[BREVO] Email sent successfully to ${toEmail}. MessageId:`, result.messageId);
    return result;
  } catch (error) {
    console.error(`[BREVO] sendBrevoEmail failed for ${toEmail}:`, error.message);
    throw error;
  }
};

/**
 * Send OTP Verification Email
 */
const sendOtpEmail = async (toEmail, otp) => {
  const htmlContent = getOtpEmailTemplate(otp);
  return sendBrevoEmail(toEmail, "Your EduVerse AI Verification Code", htmlContent);
};

/**
 * Send Welcome Email Post-Verification
 */
const sendWelcomeEmail = async (toEmail, userName) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'https://edu-verse-frontend-vert.vercel.app'}/dashboard`;
  const htmlContent = getWelcomeEmailTemplate(userName, dashboardUrl);
  return sendBrevoEmail(toEmail, `Welcome to EduVerse AI, ${userName}! 🚀`, htmlContent);
};

/**
 * Send Password Reset Email (FIX 4)
 */
const sendPasswordResetEmail = async (toEmail, resetLink, userName) => {
  const htmlContent = getPasswordResetEmailTemplate(userName, resetLink);
  return sendBrevoEmail(toEmail, "Reset Your EduVerse AI Password", htmlContent);
};

module.exports = {
  sendBrevoEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
