const axios = require("axios");
const db = require("./config/dbConnection");

async function exhaustiveSync() {
  const BASE_URL = "https://r4.smarthealthit.org";
  const SOURCE = "smart_r4";

  // --- Helper to fetch all pages of a FHIR Bundle ---
  const fetchAllBundleEntries = async (initialUrl) => {
    let entries = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
      try {
        console.log(`Fetching: ${nextUrl}`);
        const response = await axios.get(nextUrl);
        const bundle = response.data;
        if (bundle.entry) {
          entries = entries.concat(bundle.entry);
        }
        const nextLink = bundle.link?.find((l) => l.relation === "next");
        nextUrl = nextLink ? nextLink.url : null;
      } catch (err) {
        console.error(`Error fetching bundle page:`, err.message);
        nextUrl = null;
      }
    }
    return entries;
  };

  try {
    console.log("1. Syncing new patients...");
    const patientResponse = await axios.get(`${BASE_URL}/Patient?_count=20`);
    const patientEntries = patientResponse.data.entry || [];
    for (const entry of patientEntries) {
      const p = entry.resource;
      await db.execute(
        `INSERT INTO patients_raw (source_name, patient_fhir_id, raw_patient)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE raw_patient = VALUES(raw_patient)`,
        [SOURCE, p.id, JSON.stringify(p)],
      );
    }
    console.log(`Stored/Updated ${patientEntries.length} patients.`);

    console.log("2. Collecting all patient IDs...");
    const [existingPatients] = await db.execute(
      "SELECT DISTINCT patient_fhir_id FROM patients_raw WHERE source_name = ?",
      [SOURCE],
    );
    const fhirIds = existingPatients.map((p) => p.patient_fhir_id);
    console.log(`Found ${fhirIds.length} total patients in DB.`);

    const chunkSize = 20;
    let stats = { labs: 0, imaging: 0 };

    for (let i = 0; i < fhirIds.length; i += chunkSize) {
      const chunk = fhirIds.slice(i, i + chunkSize);
      const chunkQuery = chunk.join(",");
      console.log(
        `\nProcessing chunk ${i / chunkSize + 1} (${chunk.length} patients)...`,
      );

      // Labs
      console.log("Fetching labs (exhaustive)...");
      const reports = await fetchAllBundleEntries(
        `${BASE_URL}/DiagnosticReport?patient=${chunkQuery}&_count=100`,
      );
      for (const entry of reports) {
        const report = entry.resource;
        const patientId = report.subject?.reference?.split("/")[1];
        if (!patientId) continue;
        await db.execute(
          `INSERT INTO diagnostic_reports_raw
           (source_name, report_fhir_id, patient_fhir_id, category, raw_report)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE raw_report = VALUES(raw_report)`,
          [
            SOURCE,
            report.id,
            patientId,
            report.category?.[0]?.coding?.[0]?.code || "diagnostic",
            JSON.stringify(report),
          ],
        );
        stats.labs++;
      }

      // Imaging
      console.log("Fetching imaging (exhaustive)...");
      const studies = await fetchAllBundleEntries(
        `${BASE_URL}/ImagingStudy?patient=${chunkQuery}&_count=100`,
      );
      for (const entry of studies) {
        const study = entry.resource;
        const patientId = study.subject?.reference?.split("/")[1];
        if (!patientId) continue;
        await db.execute(
          `INSERT INTO imaging_studies_raw
           (source_name, imaging_fhir_id, patient_fhir_id, raw_imaging)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE raw_imaging = VALUES(raw_imaging)`,
          [SOURCE, study.id, patientId, JSON.stringify(study)],
        );
        stats.imaging++;
      }
    }

    console.log("\n--- Sync Complete ---");
    console.log("Stats:", JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error("Exhaustive Sync Failed:", e.message);
  } finally {
    process.exit();
  }
}

exhaustiveSync();
