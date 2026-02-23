const studyModel = require("../../model/studiesModel/studiesModel");
const db = require("../../config/dbConnection");
const emailNotificationService = require("../../service/emailNotificationService");

let isSyncing = false;

const pruneStudyJson = (raw) => {
  if (!raw) return raw;

  const pruned = {
    protocolSection: raw.protocolSection || {},
  };

  if (pruned.protocolSection) {
    const ps = pruned.protocolSection;

    delete ps.referencesModule;
    delete ps.oversightModule;
    delete ps.annotationModule;
    delete ps.ipdSharingStatementModule;
    delete ps.armsInterventionsModule;
    delete ps.outcomesModule;
  }

  const jsonStr = JSON.stringify(pruned);
  if (jsonStr.length > 500000) {
    console.warn(
      `⚠️ Pruned study ${pruned.protocolSection?.identificationModule?.nctId} is still large: ${(jsonStr.length / 1024).toFixed(1)} KB`,
    );
  }

  return pruned;
};

const getAllStuduies = async (req, res) => {
  if (isSyncing) {
    console.log("⚠️ Sync already in progress, skipping this run.");
    if (res) {
      return res
        .status(409)
        .json({ status: false, message: "Sync already in progress" });
    }
    return;
  }

  isSyncing = true;
  let restartedOnce = false;

  try {
    let allStudies = [];
    let newlyInsertedStudies = [];
    let fetchCount = 0;
    const maxFetches = 5;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let syncState = await studyModel.getSyncState();
    let nextPageToken = syncState?.next_page_token || null;

    while (fetchCount < maxFetches) {
      let url = "https://clinicaltrials.gov/api/v2/studies?pageSize=100";
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      console.log("🔄 Fetching:", url);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ResearchHero-Sync/1.0",
        },
      });

      const rawText = await response.text();
      if (
        rawText.includes("start over from the first page") &&
        !restartedOnce
      ) {
        console.warn(
          "⚠️ Page token invalidated. Restarting from first page...",
        );

        // Reset token in DB
        await studyModel.updateSyncState(null);

        // Reset state
        nextPageToken = null;
        restartedOnce = true;
        fetchCount = 0;
        allStudies = [];

        await sleep(1000);
        continue;
      }
      if (!response.ok || !rawText.trim().startsWith("{")) {
        throw new Error(
          `Non-JSON response from ClinicalTrials.gov: ${rawText.slice(0, 150)}`,
        );
      }

      const data = JSON.parse(rawText);

      if (!Array.isArray(data.studies)) {
        throw new Error("Invalid JSON structure (missing studies array)");
      }

      for (const item of data.studies) {
        const protocol = item.protocolSection || {};
        const idModule = protocol.identificationModule || {};
        const designModule = protocol.designModule || {};
        const conditionsModule = protocol.conditionsModule || {};
        const eligibilityModule = protocol.eligibilityModule || {};

        const study = {
          nct_id: idModule.nctId || null,
          title: idModule.briefTitle || null,
          phase: (designModule.phases || []).join(", "),
          condition_name: (conditionsModule.conditions || []).join(", "),
          enrollment: designModule.enrollmentInfo?.count || null,
          eligibility: eligibilityModule.eligibilityCriteria || null,
          locations: (protocol.contactsLocationsModule?.locations || [])
            .map((loc) => `${loc.city}, ${loc.state}`)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join("|"),
          raw_json: pruneStudyJson(item),
        };

        if (study.nct_id) {
          const [saveResult] =
            await studyModel.getAllStuduiesFromClinicalTrailGov(study);
          if (saveResult.affectedRows === 1) {
            newlyInsertedStudies.push(study);
          }
          allStudies.push(study.nct_id);
        }

        if (study.nct_id && study.condition_name) {
          await studyModel.insertStudiesCondition(study);
        }

        // Throttling: 50ms delay between individual records to prevent socket issues
        await sleep(50);
      }

      nextPageToken = data.nextPageToken || null;
      await studyModel.updateSyncState(nextPageToken);

      fetchCount++;

      if (!nextPageToken) break;

      await sleep(800);
    }

    if (newlyInsertedStudies.length > 0) {
      console.log(
        `📧 Processing email alerts for ${newlyInsertedStudies.length} new studies...`,
      );
      await emailNotificationService.processNewStudies(newlyInsertedStudies);
    }

    if (res) {
      res.json({
        status: true,
        message: `Synced ${allStudies.length} studies`,
        fetchedThisRun: allStudies.length,
        pagesFetched: fetchCount,
        restarted: restartedOnce,
        nextPageToken,
      });
    } else {
      console.log(`✅ Cron Job: Synced ${allStudies.length} studies`);
    }
  } catch (error) {
    console.error("❌ Sync error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      type: error.type,
    });

    if (res) {
      res.status(500).json({
        status: false,
        message: "Failed to sync studies",
        error: error.message,
      });
    }
  } finally {
    isSyncing = false;
  }
};

const getStudies = async (req, res) => {
  try {
    const page =
      parseInt((req.body && req.body.page) || (req.query && req.query.page)) ||
      1;
    const limit =
      parseInt(
        (req.body && req.body.limit) || (req.query && req.query.limit),
      ) || 10;
    const offset = (page - 1) * limit;

    // Use expert search if 'search' query param is provided OR if expertQuery is in body
    const searchTerm =
      req.query.search || (req.body && req.body.expertQuery?.text);

    if (searchTerm) {
      const { where, values } = await studyModel.buildExpertWhere({
        text: searchTerm,
      });

      const [rows] = await db.query(
        `
          SELECT
            id,
            nct_id,
            title,
            phase,
            condition_name,
            enrollment,
            COALESCE(locations, '') as locations,
            overall_status,
            created_at
          FROM studies
          ${where}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
          `,
        [...values, limit, offset],
      );

      const [[{ total }]] = await db.query(
        `
        SELECT COUNT(*) as total
        FROM studies
        ${where}
        `,
        values,
      );

      return res.json({
        status: true,
        mode: "expert",
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        studies: rows,
      });
    }

    // fallback to normal listing
    const result = await studyModel.getStudies({
      page,
      limit,
      search: "",
      filters: req.query,
    });

    res.json({
      status: true,
      mode: "normal",
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      studies: result.studies,
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      status: false,
      message: "Search failed",
    });
  }
};

const getStudyById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("+++++++++++++++++++++++++++++++");
    console.log("Fetching study with ID:", id);
    if (!id) {
      return res.status(400).json({ message: "Study ID is required" });
    }

    const [rows] = await db.query(
      "SELECT id, nct_id, raw_json FROM studies WHERE id = ?",
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Study not found" });
    }

    res.json({
      study: {
        id: rows[0].id,
        nct_id: rows[0].nct_id,
        raw_json:
          typeof rows[0].raw_json === "string"
            ? JSON.parse(rows[0].raw_json)
            : rows[0].raw_json,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch study" });
  }
};

module.exports = {
  getAllStuduies,
  getStudies,
  getStudyById,
};
