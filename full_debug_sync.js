const axios = require("axios");
const db = require("./config/dbConnection");

async function debugSync() {
  const BASE_URL = "https://r4.smarthealthit.org";
  const SOURCE = "smart_r4";

  try {
    console.log("1. Mapping patients...");
    const patientResponse = await axios.get(`${BASE_URL}/Patient?_count=5`);
    const entries = patientResponse.data.entry || [];
    const patientFhirIds = entries.map((e) => e.resource.id);
    console.log("Patient IDs:", patientFhirIds);

    if (patientFhirIds.length === 0) return;

    const fhirIdsQuery = patientFhirIds.join(",");
    console.log("2. Fetching labs for:", fhirIdsQuery);

    const labResponse = await axios.get(
      `${BASE_URL}/DiagnosticReport?patient=${fhirIdsQuery}&category=laboratory&_count=20`,
    );

    console.log("Lab Response Total:", labResponse.data.total);
    const labEntries = labResponse.data.entry || [];
    console.log("Lab Entries Count:", labEntries.length);

    for (const entry of labEntries) {
      const report = entry.resource;
      const patientRef = report.subject?.reference;
      const linkedPatientId = patientRef?.split("/")[1];
      console.log(
        `Processing Lab ${report.id} for Patient ${linkedPatientId} (Ref: ${patientRef})`,
      );

      try {
        const [result] = await db.execute(
          `INSERT INTO diagnostic_reports_raw
           (source_name, report_fhir_id, patient_fhir_id, category, raw_report)
           VALUES (?, ?, ?, ?, ?)`,
          [
            SOURCE,
            report.id,
            linkedPatientId || null,
            report.category?.[0]?.coding?.[0]?.code || "laboratory",
            JSON.stringify(report),
          ],
        );
        console.log("Insert Success, ID:", result.insertId);
      } catch (dbErr) {
        console.error("DB Insert Error for lab:", dbErr.message);
      }
    }
  } catch (error) {
    console.error("Overall Error:", error.message);
    if (error.response) console.error("Response data:", error.response.data);
  } finally {
    process.exit();
  }
}

debugSync();
