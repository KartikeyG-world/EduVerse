const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

exports.sendOTPEmail = async (email, name, otp) => {
  const content = `
    <h2>Hello ${name},</h2>
    <p>Your verification code for EduVerse AI is:</p>
    <div class="otp-box">${otp}</div>
    <p style="color: #ef4444; font-size: 14px;"><strong>This code expires in 10 minutes.</strong></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  const mailOptions = {
    from: '"EduVerse AI" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: "Your EduVerse AI Verification Code",
    html: getBaseTemplate(content),
  };

  await transporter.sendMail(mailOptions);
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

  const mailOptions = {
    from: '"EduVerse AI" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: "Reset Your EduVerse AI Password",
    html: getBaseTemplate(content),
  };

  await transporter.sendMail(mailOptions);
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
      <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
    </div>
  `;

  const mailOptions = {
    from: '"EduVerse AI" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: "Welcome to EduVerse AI",
    html: getBaseTemplate(content),
  };

  await transporter.sendMail(mailOptions);
};
