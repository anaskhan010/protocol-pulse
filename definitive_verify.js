const axios = require("axios");
const db = require("./config/dbConnection");

async function definitiveTest() {
  const BASE_URL = "https://r4.smarthealthit.org";
  const SOURCE = "smart_r4";

  // Known patient with imaging: 6725bdb1-3891-408f-899d-6be518f9e1c7
  const testId = "6725bdb1-3891-408f-899d-6be518f9e1c7";

  try {
    console.log(`1. Injecting test patient ${testId}...`);
    await db.execute(
      `INSERT INTO patients_raw (source_name, patient_fhir_id, raw_patient)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE raw_patient = VALUES(raw_patient)`,
      [SOURCE, testId, JSON.stringify({ id: testId, resourceType: "Patient" })],
    );

    console.log("2. Running sync logic for this ID...");
    const imgRes = await axios.get(
      `${BASE_URL}/ImagingStudy?patient=${testId}`,
    );
    const studies = imgRes.data.entry || [];
    console.log(`Found ${studies.length} studies in FHIR.`);

    for (const entry of studies) {
      const study = entry.resource;
      const patientId = study.subject?.reference?.split("/")[1];
      console.log(`Linking Study ${study.id} to Patient ${patientId}`);

      await db.execute(
        `INSERT INTO imaging_studies_raw
         (source_name, imaging_fhir_id, patient_fhir_id, raw_imaging)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE raw_imaging = VALUES(raw_imaging)`,
        [SOURCE, study.id, patientId, JSON.stringify(study)],
      );
    }

    const [dbCheck] = await db.execute(
      "SELECT COUNT(*) as count FROM imaging_studies_raw WHERE patient_fhir_id = ?",
      [testId],
    );
    console.log(
      `DB Confirmation: ${dbCheck[0].count} studies stored for ${testId}`,
    );
  } catch (e) {
    console.error("Test Error:", e.message);
  } finally {
    process.exit();
  }
}

definitiveTest();
