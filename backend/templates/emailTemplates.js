/**
 * EduVerse Modern Responsive Email Templates
 */

const BRAND_COLORS = {
  primary: '#8B5CF6',   // Violet
  secondary: '#10B981', // Emerald
  darkBg: '#0F172A',    // Dark Slate
  cardBg: '#1E293B',    // Card Slate
  textMain: '#F8FAFC',
  textMuted: '#94A3B8'
};

const getBaseLayout = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: ${BRAND_COLORS.darkBg};
      color: ${BRAND_COLORS.textMain};
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: ${BRAND_COLORS.darkBg};
      padding: 40px 0;
    }
    .main-table {
      margin: 0 auto;
      width: 100%;
      max-width: 580px;
      border-spacing: 0;
      color: ${BRAND_COLORS.textMain};
    }
    .header-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom: 2px solid ${BRAND_COLORS.primary};
      border-radius: 16px 16px 0 0;
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: ${BRAND_COLORS.secondary};
      text-decoration: none;
      margin: 0;
    }
    .logo span {
      color: ${BRAND_COLORS.primary};
    }
    .content-card {
      background-color: ${BRAND_COLORS.cardBg};
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: none;
      border-radius: 0 0 16px 16px;
      padding: 36px 32px;
    }
    h2 {
      font-size: 22px;
      font-weight: 700;
      color: ${BRAND_COLORS.textMain};
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #CBD5E1;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .otp-container {
      background: rgba(139, 92, 246, 0.08);
      border: 1px dashed ${BRAND_COLORS.primary};
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 10px;
      color: ${BRAND_COLORS.secondary};
      margin: 0;
    }
    .expire-tag {
      display: inline-block;
      margin-top: 12px;
      font-size: 13px;
      color: #F87171;
      background: rgba(239, 68, 68, 0.1);
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
    }
    .feature-list {
      margin: 24px 0;
      padding: 0;
      list-style: none;
    }
    .feature-item {
      padding: 12px 16px;
      margin-bottom: 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border-left: 3px solid ${BRAND_COLORS.secondary};
      font-size: 14px;
      color: #E2E8F0;
    }
    .cta-btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      border-radius: 10px;
      margin: 24px 0 12px 0;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
    }
    .footer {
      text-align: center;
      padding-top: 28px;
      font-size: 12px;
      color: ${BRAND_COLORS.textMuted};
    }
    .footer a {
      color: ${BRAND_COLORS.primary};
      text-decoration: none;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table">
      <tr>
        <td class="header-card">
          <div class="logo">EduVerse <span>AI</span></div>
        </td>
      </tr>
      <tr>
        <td class="content-card">
          ${content}
          <div class="footer">
            <p style="margin-bottom: 8px;">Need help? Reach out at <a href="mailto:support@eduverse.ai">support@eduverse.ai</a></p>
            <p style="margin-top: 0;">© ${new Date().getFullYear()} EduVerse AI. All rights reserved.</p>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

/**
 * OTP Verification Email Template
 */
exports.getOtpEmailTemplate = (otp) => {
  const content = `
    <h2>Verify Your Email</h2>
    <p>Thank you for joining <strong>EduVerse AI</strong>. Use the One-Time Password (OTP) below to complete your account verification:</p>
    
    <div class="otp-container">
      <div class="otp-code">${otp}</div>
      <div class="expire-tag">⏱ Expires in 10 minutes</div>
    </div>
    
    <p style="font-size: 13px; color: #94A3B8;">If you did not initiate this request, please disregard this email. Never share your OTP with anyone.</p>
  `;
  return getBaseLayout("EduVerse AI — OTP Verification", content);
};

/**
 * Welcome Email Template
 */
exports.getWelcomeEmailTemplate = (userName, dashboardUrl) => {
  const content = `
    <h2>Welcome aboard, ${userName}! 🚀</h2>
    <p>We're thrilled to have you in the <strong>EduVerse AI</strong> community. EduVerse is designed to supercharge your learning and productivity with powerful AI tools.</p>
    
    <p><strong>Here's what you can do right away:</strong></p>
    <ul class="feature-list">
      <li class="feature-item">📚 <strong>Smart AI Notes:</strong> Generate instant summaries & study flashcards</li>
      <li class="feature-item">📅 <strong>Adaptive Study Planners:</strong> Organize your schedules dynamically</li>
      <li class="feature-item">🎯 <strong>Deep Focus Mode:</strong> Eliminate distractions with pomodoro focus sessions</li>
      <li class="feature-item">📈 <strong>Skill Mastery Analytics:</strong> Track your progress with gamified XP</li>
    </ul>

    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="cta-btn">Go to Your Dashboard</a>
    </div>

    <p style="font-size: 13px; color: #94A3B8; text-align: center; margin-top: 16px;">
      Got questions? Reply directly to this email or visit our Help Center.
    </p>
  `;
  return getBaseLayout(`Welcome to EduVerse AI, ${userName}!`, content);
};
