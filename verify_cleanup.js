const db = require("./config/dbConnection");
const emailController = require("./controller/emailManamentController/emailController");
const emailNotificationService = require("./service/emailNotificationService");

(async () => {
  try {
    console.log("🧪 Verifying Data Cleanup...");

    // Simulate a request with "polluted" data (e.g., Weekly with frequency_date)
    const req = {
      body: {
        alert_id: 10,
        user_id: 5,
        email_type_id: 1,
        frequency_id: 8, // Weekly
        condtion: "Test Condition",
        frequency_time: "10:00",
        frequency_day: "Monday",
        frequency_date: 15, // SHOULD BE NULLIFIED
      },
    };

    const res = {
      status: (code) => ({
        json: (data) => console.log(`Response [${code}]:`, data),
      }),
    };

    await emailController.updateSendEmailAlerts(req, res);

    // Check DB
    const [rows] = await db.query(
      "SELECT frequency_id, frequency_day, frequency_date FROM send_email_alerts WHERE alert_id = 10",
    );
    console.log("Updated Data (should have frequency_date = null):", rows[0]);

    if (rows[0].frequency_date === null) {
      console.log("✅ Data cleanup verified.");
    } else {
      console.error("❌ Data cleanup failed.");
    }

    console.log("\n🧪 Verifying First-Day Trigger Logic...");
    // Current time is 14:15
    // Set alert to 14:10, and set last_sent_at = created_at to trigger it
    await db.query(
      "UPDATE send_email_alerts SET last_sent_at = created_at, frequency_time = '14:10', frequency_day = 'Wednesday' WHERE alert_id = 10",
    );

    console.log("Triggering processScheduledAlerts...");
    await emailNotificationService.processScheduledAlerts();

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
