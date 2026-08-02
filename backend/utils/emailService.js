const emailSender = (process.env.BREVO_SENDER_EMAIL || '').trim();
const apiKey = (process.env.BREVO_API_KEY || '').trim();

// Verify credentials presence
if (!apiKey) {
  console.warn('[EMAIL] WARNING: BREVO_API_KEY is not defined in environment variables.');
}
if (!emailSender) {
  console.warn('[EMAIL] WARNING: BREVO_SENDER_EMAIL is not defined in environment variables.');
}

const getBaseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #8b5cf6; }
    .logo { color: #10b981; font-size: 28px; font-weight: bold; margin: 0; }
    .logo span { color: #8b5cf6; }
    .content { padding: 30px 20px; background-color: #1e293b; border-radius: 12px; margin-top: 20px; border: 1px solid rgba(255, 255, 255, 0.05); }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #8b5cf6 0%, #10b981 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .otp-box { background: rgba(139, 92, 246, 0.1); border: 1px dashed #8b5cf6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #10b981; border-radius: 8px; margin: 20px 0; }
    h2 { color: #f8fafc; }
    p { color: #cbd5e1; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">EduVerse <span>AI</span></h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} EduVerse AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const sendBrevoEmail = async (toEmail, toName, subject, htmlContent) => {
  if (!apiKey || !emailSender) {
    throw new Error('Email service configuration missing (BREVO_API_KEY or BREVO_SENDER_EMAIL)');
  }

  const payload = {
    sender: {
      name: 'EduVerse AI',
      email: emailSender
    },
    to: [
      {
        email: toEmail,
        name: toName || toEmail
      }
    ],
    subject: subject,
    htmlContent: htmlContent
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[EMAIL] Brevo API Error response:', responseData);
      throw new Error(`Brevo API returned status ${response.status}: ${responseData.message || JSON.stringify(responseData)}`);
    }

    console.log(`[EMAIL] Email sent successfully to ${toEmail}. MessageId: ${responseData.messageId}`);
    return responseData;
  } catch (error) {
    console.error(`[EMAIL] Failed to send email to ${toEmail}:`, error.message);
    throw error;
  }
};

exports.sendOTPEmail = async (email, name, otp) => {
  const content = `
    <h2>Hello ${name},</h2>
    <p>Your verification code for EduVerse AI is:</p>
    <div class="otp-box">${otp}</div>
    <p style="color: #ef4444; font-size: 14px;"><strong>This code expires in 10 minutes.</strong></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  return sendBrevoEmail(email, name, 'Your EduVerse AI Verification Code', getBaseTemplate(content));
};

exports.sendPasswordResetEmail = async (email, name, resetLink) => {
  const content = `
    <h2>Hello ${name},</h2>
    <p>You recently requested to reset your password for your EduVerse AI account. Click the button below to reset it:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="btn">Reset Password</a>
    </div>
    <p style="color: #ef4444; font-size: 14px;"><strong>This link expires in 15 minutes.</strong></p>
    <p>If you didn't request a password reset, please secure your account immediately.</p>
  `;

  return sendBrevoEmail(email, name, 'Reset Your EduVerse AI Password', getBaseTemplate(content));
};

exports.sendWelcomeEmail = async (email, name) => {
  const content = `
    <h2>Welcome to EduVerse AI, ${name}! 🚀</h2>
    <p>We're thrilled to have you join our platform. EduVerse AI is designed to supercharge your learning journey with advanced AI tools, personalized study plans, and seamless productivity features.</p>
    <p>Dive in and explore:</p>
    <ul>
      <li style="color: #cbd5e1; margin-bottom: 8px;">📚 Smart Notes with AI Summaries</li>
      <li style="color: #cbd5e1; margin-bottom: 8px;">📅 Personalized Study Planners</li>
      <li style="color: #cbd5e1; margin-bottom: 8px;">🎯 Deep Focus Mode</li>
      <li style="color: #cbd5e1;">📈 Skill Tracking & Analytics</li>
    </ul>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'https://edu-verse-frontend-vert.vercel.app'}/dashboard" class="btn">Go to Dashboard</a>
    </div>
  `;

  return sendBrevoEmail(email, name, 'Welcome to EduVerse AI', getBaseTemplate(content));
};
