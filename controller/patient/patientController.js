const axios = require("axios");
const db = require("../../config/dbConnection");

const getAllPatientsFromPracticeFusion = async (req, res) => {
  try {
    const response = await axios.get(
      "https://r4.smarthealthit.org/Patient?_count=100",
    );

    const bundle = response.data;

    const [bundleResult] = await db.execute(
      `INSERT INTO patient_bundles (source_name, bundle_id, raw_bundle)
       VALUES (?, ?, ?)`,
      ["smart_r4", bundle.id || null, JSON.stringify(bundle)],
    );

    // ✅ 2. Store Each Patient Resource
    if (bundle.entry && bundle.entry.length > 0) {
      for (const entry of bundle.entry) {
        const patient = entry.resource;

        await db.execute(
          `INSERT INTO patients_raw (source_name, patient_fhir_id, raw_patient)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE raw_patient = VALUES(raw_patient)`,
          ["smart_r4", patient.id, JSON.stringify(patient)],
        );
      }
    }

    res.status(200).json({
      message: "Patients stored successfully",
      totalPatients: bundle.entry?.length || 0,
    });
  } catch (error) {
    console.log("FHIR ERROR:", error.response?.data || error.message);

    res.status(500).json({
      message: "Internal server error",
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

const getPatientByDbId = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!id) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const [rows] = await db.execute(
      `
      SELECT
        id,
        source_name,
        patient_fhir_id,
        raw_patient,
        created_at
      FROM patients_raw
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json(rows[0]);
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
