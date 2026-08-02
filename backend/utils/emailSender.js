const sendOtpEmail = async (toEmail, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in environment variables");
    throw new Error("Email service not configured");
  }

  const payload = {
    sender: { email: senderEmail },
    to: [{ email: toEmail }],
    subject: "Your EduVerse OTP Code",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #4F46E5;">EduVerse — OTP Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="letter-spacing: 8px; color: #111;">${otp}</h1>
        <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr/>
        <small style="color: #999;">If you did not request this, please ignore this email.</small>
      </div>
    `,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Brevo API error response:", JSON.stringify(result));
      throw new Error(`Brevo API failed: ${result.message || response.status}`);
    }

    console.log("OTP email sent successfully via Brevo. MessageId:", result.messageId);
    return result;

  } catch (error) {
    console.error("sendOtpEmail failed:", error.message);
    throw error;
  }
};

module.exports = { sendOtpEmail };
