const db = require("./config/dbConnection");

async function updateSchema() {
  try {
    console.log("Applying UNIQUE constraints...");

    await db.execute(
      "ALTER TABLE diagnostic_reports_raw ADD UNIQUE (report_fhir_id)",
    );
    console.log(
      "Added UNIQUE constraint to diagnostic_reports_raw(report_fhir_id)",
    );

    await db.execute(
      "ALTER TABLE imaging_studies_raw ADD UNIQUE (imaging_fhir_id)",
    );
    console.log(
      "Added UNIQUE constraint to imaging_studies_raw(imaging_fhir_id)",
    );
  } catch (e) {
    if (
      e.message.includes("Duplicate key name") ||
      e.message.includes("already exists")
    ) {
      console.log("Constraints already exist or similar issue:", e.message);
    } else {
      console.error("Schema Update Error:", e.message);
    }
  } finally {
    process.exit();
  }
}

updateSchema();
