const axios = require("axios");

async function triggerSync() {
  try {
    console.log("Triggering Universal Sync...");
    const res = await axios.get(
      "http://localhost:5000/api/v1/patient/get-practice-fusion-patients",
    );
    console.log("Sync Response:", JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error("Sync Trigger Failed:", e.message);
    if (e.response) console.error("Response:", e.response.data);
  }
}

triggerSync();
