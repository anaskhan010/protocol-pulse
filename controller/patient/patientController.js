const axios = require("axios");
const db = require("../../config/dbConnection");

// const getAllPatientsFromPracticeFusion = async (req, res) => {
//   try {
//     const response = await axios.get(
//       "https://r4.smarthealthit.org/Patient?_count=100",
//     );

//     const bundle = response.data;

//     const [bundleResult] = await db.execute(
//       `INSERT INTO patient_bundles (source_name, bundle_id, raw_bundle)
//        VALUES (?, ?, ?)`,
//       ["smart_r4", bundle.id || null, JSON.stringify(bundle)],
//     );

//     // ✅ 2. Store Each Patient Resource
//     if (bundle.entry && bundle.entry.length > 0) {
//       for (const entry of bundle.entry) {
//         const patient = entry.resource;

//         await db.execute(
//           `INSERT INTO patients_raw (source_name, patient_fhir_id, raw_patient)
//            VALUES (?, ?, ?)
//            ON DUPLICATE KEY UPDATE raw_patient = VALUES(raw_patient)`,
//           ["smart_r4", patient.id, JSON.stringify(patient)],
//         );
//       }
//     }

//     res.status(200).json({
//       message: "Patients stored successfully",
//       totalPatients: bundle.entry?.length || 0,
//     });
//   } catch (error) {
//     console.log("FHIR ERROR:", error.response?.data || error.message);

//     res.status(500).json({
//       message: "Internal server error",
//       error: error.response?.data || error.message,
//     });
//   }
// };
const getAllPatientsFromPracticeFusion = async (req, res) => {
  try {
    const BASE_URL = "https://r4.smarthealthit.org";
    const SOURCE = "smart_r4";

    // --- Helper to fetch all pages of a FHIR Bundle ---
    const fetchAllBundleEntries = async (initialUrl) => {
      let entries = [];
      let nextUrl = initialUrl;

      while (nextUrl) {
        try {
          const response = await axios.get(nextUrl);
          const bundle = response.data;
          if (bundle.entry) {
            entries = entries.concat(bundle.entry);
          }
          // Find 'next' link
          const nextLink = bundle.link?.find((l) => l.relation === "next");
          nextUrl = nextLink ? nextLink.url : null;
        } catch (err) {
          console.error(
            `Error fetching bundle page at ${nextUrl}:`,
            err.message,
          );
          nextUrl = null;
        }
      }
      return entries;
    };

    // ===============================
    // 1️⃣ SYNC NEW PATIENTS (Expansion)
    // ===============================
    const patientResponse = await axios.get(`${BASE_URL}/Patient?_count=20`);
    const patientBundle = patientResponse.data;

    if (patientBundle.entry) {
      for (const entry of patientBundle.entry) {
        const patient = entry.resource;
        await db.execute(
          `INSERT INTO patients_raw (source_name, patient_fhir_id, raw_patient)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE raw_patient = VALUES(raw_patient)`,
          [SOURCE, patient.id, JSON.stringify(patient)],
        );
      }
    }

    // ===============================
    // 2️⃣ COLLECT ALL PATIENT FHIR IDS FOR UNIVERSAL SYNC
    // ===============================
    const [existingPatients] = await db.execute(
      "SELECT DISTINCT patient_fhir_id FROM patients_raw WHERE source_name = ?",
      [SOURCE],
    );

    const fhirIds = existingPatients.map((p) => p.patient_fhir_id);

    if (fhirIds.length === 0) {
      return res
        .status(200)
        .json({ message: "No patients to sync clinical data for" });
    }

    // ===============================
    // 3️⃣ CHUNKED BATCH SYNC FOR CLINICAL DATA (EXHAUSTIVE)
    // ===============================
    const chunkSize = 20;
    let syncStats = { labs: 0, imaging: 0 };

    for (let i = 0; i < fhirIds.length; i += chunkSize) {
      const chunk = fhirIds.slice(i, i + chunkSize);
      const chunkQuery = chunk.join(",");

      // --- Fetch ALL DiagnosticReports (Exhaustive) ---
      // Removed strict 'laboratory' filter to catch 'LAB' and others in sandbox
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
        syncStats.labs++;
      }

      // --- Fetch ALL ImagingStudies (Exhaustive) ---
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
        syncStats.imaging++;
      }
    }

    res.status(200).json({
      message: "Exhaustive universal synchronization completed successfully",
      stats: {
        totalPatientsProcessed: fhirIds.length,
        recordsFound: syncStats,
      },
    });
  } catch (error) {
    console.log("UNIVERSAL SYNC ERROR:", error.response?.data || error.message);
    res.status(500).json({
      message: "Internal server error during universal sync",
      error: error.response?.data || error.message,
    });
  }
};

const getAllPatientsFromDB = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (!page || page < 1) page = 1;
    if (!limit || limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // ✅ Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM patients_raw`,
    );

    const total = countResult[0].total;

    // ✅ IMPORTANT: Inject validated numbers directly (safe because we validated)
    const query = `
      SELECT 
        id,
        source_name,
        patient_fhir_id,

        JSON_UNQUOTE(JSON_EXTRACT(raw_patient, '$.name[0].given[0]')) AS first_name,
        JSON_UNQUOTE(JSON_EXTRACT(raw_patient, '$.name[0].family')) AS last_name,
        JSON_UNQUOTE(JSON_EXTRACT(raw_patient, '$.gender')) AS gender,
        JSON_UNQUOTE(JSON_EXTRACT(raw_patient, '$.birthDate')) AS birth_date,
        JSON_UNQUOTE(JSON_EXTRACT(raw_patient, '$.telecom[0].value')) AS phone,

        created_at

      FROM patients_raw
      ORDER BY id DESC
      LIMIT ${offset}, ${limit}
    `;

    const [rows] = await db.query(query);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });
  } catch (error) {
    console.error("Pagination Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// const getPatientByDbId = async (req, res) => {
//   try {
//     const id = parseInt(req.params.id, 10);

//     if (!id) {
//       return res.status(400).json({ message: "Invalid id" });
//     }

//     const [rows] = await db.execute(
//       `
//       SELECT
//         id,
//         source_name,
//         patient_fhir_id,
//         raw_patient,
//         created_at
//       FROM patients_raw
//       WHERE id = ?
//       LIMIT 1
//       `,
//       [id],
//     );

//     if (!rows || rows.length === 0) {
//       return res.status(404).json({ message: "Patient not found" });
//     }

//     res.status(200).json(rows[0]);
//   } catch (error) {
//     console.error("getPatientByDbId error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const getPatientByDbId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid patient id" });
    }

    // 1) Fetch Patient record from DB to get FHIR ID and Source Name
    const [patientRows] = await db.execute(
      `
      SELECT id, source_name, patient_fhir_id, raw_patient, created_at
      FROM patients_raw
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    if (!patientRows.length) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patient = patientRows[0];
    const { patient_fhir_id: patientFhirId, source_name: sourceName } = patient;

    // 2) Labs (DiagnosticReport)
    const [labs] = await db.execute(
      `
      SELECT id, report_fhir_id, category, raw_report, created_at
      FROM diagnostic_reports_raw
      WHERE source_name = ? AND patient_fhir_id = ?
      ORDER BY id DESC
      `,
      [sourceName, patientFhirId],
    );

    // 3) Imaging (ImagingStudy)
    const [imaging] = await db.execute(
      `
      SELECT id, imaging_fhir_id, raw_imaging, created_at
      FROM imaging_studies_raw
      WHERE source_name = ? AND patient_fhir_id = ?
      ORDER BY id DESC
      `,
      [sourceName, patientFhirId],
    );

    res.status(200).json({
      patient,
      labs,
      imaging,
    });
  } catch (error) {
    console.error("getPatientByDbId error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getAllPatientsFromPracticeFusion,
  getAllPatientsFromDB,
  getPatientByDbId,
};
