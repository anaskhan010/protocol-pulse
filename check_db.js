const db = require("./config/dbConnection");

async function checkSchema() {
  try {
    const [diagSchema] = await db.query("DESCRIBE diagnostic_reports_raw");
    console.log("diagnostic_reports_raw Schema:", diagSchema);

    const [imgSchema] = await db.query("DESCRIBE imaging_studies_raw");
    console.log("imaging_studies_raw Schema:", imgSchema);

    const [diagCount] = await db.query(
      "SELECT COUNT(*) as total FROM diagnostic_reports_raw",
    );
    console.log("Diagnostic Reports Count:", diagCount[0].total);

    const [imgCount] = await db.query(
      "SELECT COUNT(*) as total FROM imaging_studies_raw",
    );
    console.log("Imaging Studies Count:", imgCount[0].total);

    const [recentDiag] = await db.query(
      "SELECT patient_fhir_id, report_fhir_id FROM diagnostic_reports_raw ORDER BY id DESC LIMIT 5",
    );
    console.log("Recent Diagnostic Reports:", recentDiag);
  } catch (e) {
    console.error("Database Error:", e.message);
  } finally {
    process.exit();
  }
}

checkSchema();
