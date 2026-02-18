const db = require("./config/dbConnection");

(async () => {
  try {
    const [rows] = await db.query(`
      SELECT sea.*, ef.code as freq_code, ef.label as freq_label 
      FROM send_email_alerts sea 
      LEFT JOIN email_frequencies ef ON sea.frequency_id = ef.id
    `);
    console.log("Alerts in DB:");
    console.log(JSON.stringify(rows, null, 2));

    const now = new Date();
    console.log(
      "Current System Day:",
      now.toLocaleDateString("en-US", { weekday: "long" }),
    );
    console.log("Current System Time:", now.toTimeString().slice(0, 5));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
