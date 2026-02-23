const db = require("../../config/dbConnection");

let totalCountCache = {
  total: 0,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
};

const getAllStuduiesFromClinicalTrailGov = async (study) => {
  let locations = "";
  if (study.raw_json?.protocolSection?.contactsLocationsModule?.locations) {
    try {
      locations =
        study.raw_json.protocolSection.contactsLocationsModule.locations
          .map((loc) => `${loc.city}, ${loc.state}`)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join("|");
    } catch (err) {
      locations = "";
    }
  }

  try {
    const sql = `
      INSERT INTO studies 
      (nct_id, title, phase, condition_name, enrollment, eligibility, locations, raw_json, overall_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        phase = VALUES(phase),
        condition_name = VALUES(condition_name),
        enrollment = VALUES(enrollment),
        eligibility = VALUES(eligibility),
        locations = VALUES(locations),
        raw_json = VALUES(raw_json),
        overall_status = VALUES(overall_status)
    `;

    const overallStatus =
      study.raw_json?.protocolSection?.statusModule?.overallStatus || null;

    const values = [
      study.nct_id,
      study.title,
      study.phase,
      study.condition_name,
      study.enrollment,
      study.eligibility,
      locations || null,
      JSON.stringify(study.raw_json),
      overallStatus,
    ];

    return await db.safeQuery(sql, values);
  } catch (err) {
    if (err.message.includes("Unknown column 'locations'")) {
      console.log("ℹ️  locations column not found, trying without it...");

      const sql = `
        INSERT INTO studies 
        (nct_id, title, phase, condition_name, enrollment, eligibility, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          phase = VALUES(phase),
          condition_name = VALUES(condition_name),
          enrollment = VALUES(enrollment),
          eligibility = VALUES(eligibility),
          raw_json = VALUES(raw_json)
      `;

      const values = [
        study.nct_id,
        study.title,
        study.phase,
        study.condition_name,
        study.enrollment,
        study.eligibility,
        JSON.stringify(study.raw_json),
      ];

      return await db.safeQuery(sql, values);
    }
    throw err;
  }
};
const getSyncState = async () => {
  const [rows] = await db.safeQuery(
    `SELECT next_page_token, last_synced_at
     FROM clinical_sync_state
     WHERE id = 1
     LIMIT 1`,
  );

  return rows.length ? rows[0] : null;
};
const updateSyncState = async (nextPageToken) => {
  await db.safeQuery(
    `INSERT INTO clinical_sync_state (id, next_page_token, last_synced_at)
     VALUES (1, ?, NOW())
     ON DUPLICATE KEY UPDATE
       next_page_token = VALUES(next_page_token),
       last_synced_at = VALUES(last_synced_at)`,
    [nextPageToken],
  );
};

const insertStudiesCondition = async (study) => {
  try {
    const sql = `
      INSERT INTO studies_condition 
      (nct_id, conditions)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        conditions = VALUES(conditions)
    `;

    const values = [study.nct_id, study.condition_name];

    return await db.safeQuery(sql, values);
  } catch (err) {
    throw err;
  }
};

// *****************************************************//

const getStudies = async ({ page, limit, search, filters = {} }) => {
  const offset = (page - 1) * limit;

  let whereConditions = [];
  let params = [];

  if (search) {
    const locationKeywords = ["in ", "at ", "near "];
    const hasLocationKeyword = locationKeywords.some((keyword) =>
      search.toLowerCase().includes(keyword),
    );

    if (hasLocationKeyword) {
      const parts = search.toLowerCase().split(/\s+in\s+|\s+at\s+|\s+near\s+/i);
      const condition = parts[0]?.trim();
      const location = parts[1]?.trim();

      if (condition) {
        whereConditions.push(
          "(nct_id LIKE ? OR title LIKE ? OR condition_name LIKE ?)",
        );
        params.push(`%${condition}%`, `%${condition}%`, `%${condition}%`);
      }

      if (location) {
        whereConditions.push("COALESCE(locations, '') LIKE ?");
        params.push(`%${location}%`);
      }
    } else {
      whereConditions.push(
        "(nct_id LIKE ? OR title LIKE ? OR condition_name LIKE ? OR COALESCE(locations, '') LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
  }

  if (filters.phase && filters.phase.length > 0) {
    const phasePlaceholders = filters.phase
      .map(() => "FIND_IN_SET(?, phase)")
      .join(" OR ");
    whereConditions.push(`(${phasePlaceholders})`);
    params.push(...filters.phase);
  }

  if (filters.condition) {
    whereConditions.push("condition_name LIKE ?");
    params.push(`%${filters.condition}%`);
  }
  if (filters.location) {
    whereConditions.push("COALESCE(locations, '') LIKE ?");
    params.push(`%${filters.location}%`);
  }

  if (filters.enrollmentMin !== undefined && filters.enrollmentMin !== "") {
    whereConditions.push("enrollment >= ?");
    params.push(parseInt(filters.enrollmentMin));
  }

  if (filters.enrollmentMax !== undefined && filters.enrollmentMax !== "") {
    whereConditions.push("enrollment <= ?");
    params.push(parseInt(filters.enrollmentMax));
  }

  const whereClause =
    whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

  try {
    const dataQuery = `
      SELECT id, nct_id, title, phase, condition_name, enrollment, COALESCE(locations, '') as locations,
      overall_status
      FROM studies
      ${whereClause}
      ORDER BY nct_id DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM studies
      ${whereClause}
    `;

    let total;
    if (
      whereClause === "" &&
      Date.now() - totalCountCache.timestamp < totalCountCache.ttl
    ) {
      total = totalCountCache.total;
    } else {
      const [[{ total: computedTotal }]] = await db.safeQuery(
        countQuery,
        params,
      );
      total = computedTotal;
      if (whereClause === "") {
        totalCountCache.total = total;
        totalCountCache.timestamp = Date.now();
      }
    }

    const [rows] = await db.safeQuery(dataQuery, [...params, limit, offset]);

    return {
      total,
      studies: rows,
    };
  } catch (err) {
    if (err.message.includes("Unknown column 'locations'")) {
      console.log("ℹ️  locations column not found, selecting without it...");

      const dataQuery = `
        SELECT nct_id, title, phase, condition_name, enrollment, '' as locations,
        JSON_UNQUOTE(JSON_EXTRACT(raw_json, '$.protocolSection.statusModule.overallStatus')) AS overall_status
        FROM studies
        ${whereClause}
        ORDER BY nct_id DESC
        LIMIT ? OFFSET ?
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM studies
        ${whereClause}
      `;

      const [[{ total }]] = await db.safeQuery(countQuery, params);
      const [rows] = await db.safeQuery(dataQuery, [...params, limit, offset]);

      return {
        total,
        studies: rows,
      };
    }
    throw err;
  }
};

const STOPWORDS = new Set([
  "in",
  "of",
  "the",
  "and",
  "or",
  "at",
  "near",
  "on",
  "to",
  "for",
  "a",
  "an",
]);

const tokenizeExpertText = (text) => {
  if (!text) return [];
  // Split by spaces and common punctuation, but keep NCT IDs (NCT followed by digits) intact
  return text
    .toLowerCase()
    .split(/[\s,.;:!?()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
};

const buildExpertWhere = ({ text }) => {
  const tokens = tokenizeExpertText(text);

  if (!tokens.length) return { where: "", values: [] };

  // MariaDB/MySQL Boolean Mode Search
  // We'll treat the inquiry as a set of required tokens
  const booleanQuery = tokens.map((t) => `+${t}*`).join(" ");

  return {
    where: "WHERE MATCH(search_text) AGAINST(? IN BOOLEAN MODE)",
    values: [booleanQuery],
  };
};

module.exports = {
  getAllStuduiesFromClinicalTrailGov,
  getSyncState,
  updateSyncState,
  insertStudiesCondition,
  getStudies,
  buildExpertWhere,
};
