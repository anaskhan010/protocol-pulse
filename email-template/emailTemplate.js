const axios = require("axios");
const fromEmail = process.env.EMAIL_FROM || "info@aicruitment.com";
exports.sendEmail = async ({ to, subject, htmlBody }) => {
  const apiKey = "em_1ZlKGyfmVdMJpbnLnzQz9DtFGHsmoSpD";

  try {
    await axios.post(
      "https://api.emailit.com/v1/emails",
      {
        from: fromEmail,
        to,
        subject,
        html: htmlBody,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "Email sending failed:",
      error.response?.data || error.message,
    );
    // Rethrow to let controller know, OR return false
    throw error;
  }
};
