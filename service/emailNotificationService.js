const emailModel = require("../model/emailManagementModel/emailModel");
const emailTemplate = require("../email-template/emailTemplate");
const db = require("../config/dbConnection");

/**
 * Checks if a study matches the condition based on "probability match".
 * Case-insensitive bidirectional inclusion check.
 */
const isMatch = (condition, studyCondition) => {
  if (!condition || !studyCondition) return false;

  const cond = condition.toLowerCase().trim();
  const studyCond = studyCondition.toLowerCase().trim();

  // Case 1: Direct inclusion (e.g., "Cancer" in "Breast Cancer")
  if (cond.includes(studyCond) || studyCond.includes(cond)) return true;

  // Case 2: Shared significant words (e.g., "Heart Disease" and "Heart Failure" share "Heart")
  const words1 = cond.split(/\s+/).filter((w) => w.length > 3);
  const words2 = studyCond.split(/\s+/).filter((w) => w.length > 3);

  return words1.some((w1) => words2.some((w2) => w1 === w2));
};

const processNewStudies = async (newStudies) => {
  if (!newStudies || newStudies.length === 0) return;

  try {
    // email_type_id = 1 is for "New Studies Alert"
    // frequency_id = 6 is for "IMMEDIATE"
    const [alerts] = await db.query(
      "SELECT sea.*, u.email as user_email, u.first_name, u.user_name FROM send_email_alerts sea LEFT JOIN users u ON sea.user_id = u.user_id WHERE sea.email_type_id = ? AND sea.status = 'Active' AND sea.frequency_id = 6",
      [1],
    );

    if (!alerts || alerts.length === 0) {
      // Quietly return if no immediate alerts
      return;
    }

    // Group alerts by user to send one email per user with multiple studies
    const userMatches = {};

    for (const alert of alerts) {
      const matchedStudies = newStudies.filter((study) => {
        // study.condition_name can be a comma-separated list
        const studyConditions = study.condition_name
          ? study.condition_name.split(",").map((c) => c.trim())
          : [];

        // alert.condtion can also be multiple conditions separated by commas
        const alertConditions = alert.condtion
          ? alert.condtion.split(",").map((c) => c.trim())
          : [];

        return alertConditions.some((aCond) =>
          studyConditions.some((sCond) => isMatch(aCond, sCond)),
        );
      });

      if (matchedStudies.length > 0) {
        if (!userMatches[alert.user_email]) {
          userMatches[alert.user_email] = {
            userInfo: alert,
            studies: [],
          };
        }
        // Add studies (avoid duplicates if multiple alerts for same user match different studies)
        matchedStudies.forEach((s) => {
          if (
            !userMatches[alert.user_email].studies.find(
              (existing) => existing.nct_id === s.nct_id,
            )
          ) {
            userMatches[alert.user_email].studies.push(s);
          }
        });
      }
    }

    // Send emails
    for (const email of Object.keys(userMatches)) {
      const { userInfo, studies } = userMatches[email];

      const studyListHtml = studies
        .map(
          (study) => `
        <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #2563eb;">${study.title}</h3>
          <p style="margin: 5px 0;"><strong>ID:</strong> ${study.nct_id}</p>
          <p style="margin: 5px 0;"><strong>Condition:</strong> ${study.condition_name}</p>
          <p style="margin: 5px 0;"><strong>Phase:</strong> ${study.phase}</p>
          <a href="https://clinicaltrials.gov/study/${study.nct_id}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-size: 14px;">
             View Study Details
          </a>
        </div>
      `,
        )
        .join("");

      const htmlBody = `
       <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>New Study Alerts</title>
    <style>
      /* --- Email-safe reset --- */
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        width: 100% !important;
      }
      * {
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
      }
      table,
      td {
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }
      img {
        -ms-interpolation-mode: bicubic;
        border: 0;
        outline: none;
        text-decoration: none;
      }
      a {
        text-decoration: none;
      }

      /* --- Typography --- */
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: #f3f4f6;
        color: #111827;
        line-height: 1.6;
      }

      /* --- Container --- */
      .wrapper {
        width: 100%;
        background: #f3f4f6;
        padding: 28px 0;
      }
      .container {
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 12px 30px rgba(17, 24, 39, 0.08);
      }

      /* --- Header --- */
      .header {
        background: linear-gradient(135deg, #0b1b5c 0%, #1d4ed8 100%);
        padding: 26px 24px 18px 24px;
        color: #ffffff;
      }
      .brand {
        display: inline-block;
        font-weight: 800;
        letter-spacing: 0.2px;
        font-size: 18px;
        line-height: 1;
      }
      .badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.22);
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 10px;
        vertical-align: middle;
      }
      .header h1 {
        margin: 14px 0 6px 0;
        font-size: 22px;
        line-height: 1.25;
      }
      .header p {
        margin: 0;
        color: rgba(255, 255, 255, 0.85);
        font-size: 13px;
      }

      /* --- Content --- */
      .content {
        padding: 22px 24px 6px 24px;
      }
      .greeting {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #111827;
      }

      .summary {
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 14px 14px;
        margin: 14px 0 18px 0;
      }
      .summary-row {
        font-size: 13px;
        color: #334155;
        margin: 0;
      }
      .summary strong {
        color: #111827;
      }
      .count-pill {
        display: inline-block;
        background: #1d4ed8;
        color: #ffffff;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        vertical-align: middle;
        margin-left: 6px;
      }

      /* --- Section Title --- */
      .section-title {
        margin: 0 0 10px 0;
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: 0.2px;
        text-transform: uppercase;
      }

      /* --- Studies List Wrapper --- */
      .studies {
        margin: 0;
        padding: 0;
      }

      /* --- CTA --- */
      .cta-wrap {
        padding: 10px 24px 22px 24px;
      }
      .cta {
        display: inline-block;
        background: #111827;
        color: #ffffff !important;
        padding: 12px 16px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
      }
      .cta-sub {
        margin: 10px 0 0 0;
        font-size: 12px;
        color: #6b7280;
      }

      /* --- Footer --- */
      .footer {
        padding: 18px 24px 22px 24px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
      .footer p {
        margin: 4px 0;
        font-size: 12px;
        color: #6b7280;
      }
      .muted-link {
        color: #374151 !important;
        text-decoration: underline;
      }

      /* --- Mobile --- */
      @media only screen and (max-width: 520px) {
        .header {
          padding: 22px 18px 16px 18px;
        }
        .content,
        .cta-wrap,
        .footer {
          padding-left: 18px !important;
          padding-right: 18px !important;
        }
        .header h1 {
          font-size: 20px;
        }
      }
    </style>
  </head>

  <body>
    <div class="wrapper">
      <!-- Full-width wrapper table for email clients -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              class="container"
            >
              <!-- Header -->
              <tr>
                <td class="header">
                  <span class="brand">Research Pulse</span>
                  <span class="badge">Study Alerts</span>

                  <h1>New Study Alerts</h1>
                  <p>Fresh matches based on your saved criteria</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td class="content">
                  <p class="greeting">
                    Hello ${userInfo.first_name || userInfo.user_name || "there"},
                  </p>

                  <div class="summary">
                    <p class="summary-row">
                      We found
                      <strong>${studies.length}</strong>
                      <span class="count-pill">${studies.length} New</span>
                      clinical study matches for your criteria.
                    </p>
                    <p class="summary-row" style="margin-top: 6px">
                      Review details below and take action in your dashboard.
                    </p>
                  </div>

                  <p class="section-title">Matched Studies</p>

                  <!-- Injected list (your existing HTML) -->
                  <div class="studies">
                    ${studyListHtml}
                  </div>
                </td>
              </tr>

              <!-- CTA -->
             

              <!-- Footer -->
              <tr>
                <td class="footer">
                  <p>
                    You received this because you’re subscribed to New Study Alerts on
                    <strong>Research Pulse</strong>.
                  </p>
                  <p>
                    © 2026 Research Pulse. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Outer spacing note (optional) -->
            <div style="height: 18px; line-height: 18px">&nbsp;</div>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>

      `;

      const subject = `New Clinical Study Matches Found - ${studies.length} New Results`;
      try {
        await emailTemplate.sendEmail({
          to: email,
          subject: subject,
          htmlBody,
        });
        await emailModel.logEmail(email, subject, "Immediate Study Alert");
        console.log(
          `✅ Email sent to ${email} for ${studies.length} study matches.`,
        );
      } catch (err) {
        console.error(`❌ Failed to send email to ${email}:`, err.message);
      }
    }
  } catch (error) {
    console.error("❌ Error processing new study alerts:", error);
  }
};

const processScheduledAlerts = async () => {
  try {
    const [alerts] = await db.query(`
      SELECT sea.*, u.email as user_email, u.first_name, u.user_name, ef.code as frequency_code
      FROM send_email_alerts sea
      LEFT JOIN users u ON sea.user_id = u.user_id
      LEFT JOIN email_frequencies ef ON sea.frequency_id = ef.id
      WHERE sea.status = 'Active' AND sea.frequency_id != 6
    `);

    if (!alerts || alerts.length === 0) return;

    const now = new Date();
    const currentDay = now.toLocaleDateString("en-US", { weekday: "long" }); // e.g., "Monday"
    const currentDate = now.getDate(); // 1-31
    const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:MM"

    for (const alert of alerts) {
      let isDue = false;
      const alertTime = alert.frequency_time; // Expecting "HH:MM" format from frontend

      if (!alertTime) continue;

      const lastSent = new Date(alert.last_sent_at);
      const isAlreadySentToday =
        lastSent.toDateString() === now.toDateString() &&
        alert.last_sent_at.getTime() !== alert.created_at.getTime();

      // Debug log (can be removed later)
      // console.log(`Alert ${alert.alert_id}: Now=${currentTimeStr}, Target=${alertTime}, AlreadySentToday=${isAlreadySentToday}`);

      if (alert.frequency_code === "DAILY") {
        if (currentTimeStr >= alertTime && !isAlreadySentToday) {
          isDue = true;
        }
      } else if (alert.frequency_code === "WEEKLY") {
        if (
          alert.frequency_day === currentDay &&
          currentTimeStr >= alertTime &&
          !isAlreadySentToday
        ) {
          isDue = true;
        }
      } else if (alert.frequency_code === "MONTHLY") {
        if (
          alert.frequency_date == currentDate &&
          currentTimeStr >= alertTime &&
          !isAlreadySentToday
        ) {
          isDue = true;
        }
      }

      if (isDue) {
        console.log(
          `Processing scheduled alert ${alert.alert_id} for user ${alert.user_email}`,
        );

        // Fetch new studies since last_sent_at
        const [recentStudies] = await db.query(
          "SELECT * FROM studies WHERE created_at > ?",
          [alert.last_sent_at],
        );

        if (recentStudies.length === 0) {
          // Update last_sent_at anyway to avoid checking again today
          await emailModel.updateLastSentAt(alert.alert_id);
          continue;
        }

        // Apply condition matching
        const alertConditions = alert.condtion
          ? alert.condtion.split(",").map((c) => c.trim())
          : [];

        const matchedStudies = recentStudies.filter((study) => {
          const studyConditions = study.condition_name
            ? study.condition_name.split(",").map((c) => c.trim())
            : [];
          return alertConditions.some((aCond) =>
            studyConditions.some((sCond) => isMatch(aCond, sCond)),
          );
        });

        if (matchedStudies.length > 0) {
          // Send Email (Reuse your existing email template logic)
          await sendDigestEmail(alert, matchedStudies);
          console.log(`✅ Digest email sent to ${alert.user_email}`);
        }

        // Update last_sent_at
        await emailModel.updateLastSentAt(alert.alert_id);
      }
    }
  } catch (error) {
    console.error("❌ Error in processScheduledAlerts:", error);
  }
};

// Helper to send the email (extracted from processNewStudies for reuse)
const sendDigestEmail = async (userInfo, studies) => {
  const studyListHtml = studies
    .map(
      (study) => `
    <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
      <h3 style="margin: 0 0 10px 0; color: #2563eb;">${study.title}</h3>
      <p style="margin: 5px 0;"><strong>ID:</strong> ${study.nct_id}</p>
      <p style="margin: 5px 0;"><strong>Condition:</strong> ${study.condition_name}</p>
      <p style="margin: 5px 0;"><strong>Phase:</strong> ${study.phase}</p>
      <a href="https://clinicaltrials.gov/study/${study.nct_id}" 
         style="display: inline-block; background-color: #2563eb; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-size: 14px;">
         View Study Details
      </a>
    </div>
  `,
    )
    .join("");

  const htmlBody = `
   <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Scheduled Study Digest</title>
    <style>
      body { font-family: sans-serif; background: #f3f4f6; padding: 20px; }
      .container { background: white; border-radius: 10px; padding: 25px; max-width: 600px; margin: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 15px; }
      .study-item { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2 style="color: #2563eb; margin: 0;">Study Digest Alert</h2>
        <p style="color: #666; margin: 5px 0 0 0;">New matches for your criteria</p>
      </div>
      <p>Hello ${userInfo.first_name || userInfo.user_name || "there"},</p>
      <p>We found <strong>${studies.length}</strong> new clinical study matches for you.</p>
      <div class="studies">
        ${studyListHtml}
      </div>
      <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
        <p>© 2026 Research Pulse. You received this because of your frequency settings.</p>
      </div>
    </div>
  </body>
</html>
  `;

  const subject = `Your ${studies.length} New Clinical Study Matches`;
  await emailTemplate.sendEmail({
    to: userInfo.user_email,
    subject: subject,
    htmlBody,
  });
  await emailModel.logEmail(
    userInfo.user_email,
    subject,
    "Scheduled Study Alert",
  );
};

module.exports = {
  processNewStudies,
  processScheduledAlerts,
};
