const axios = require("axios");

async function analyzeFHIR() {
  const BASE_URL = "https://r4.smarthealthit.org";

  console.log("--- Analyzing DiagnosticReport Categories ---");
  try {
    const res = await axios.get(`${BASE_URL}/DiagnosticReport?_count=50`);
    const entries = res.data.entry || [];
    const categories = {};
    const patientCounts = {};

    entries.forEach((e) => {
      const report = e.resource;
      const cat = report.category?.[0]?.coding?.[0]?.code || "no-category";
      categories[cat] = (categories[cat] || 0) + 1;

      const pRef = report.subject?.reference || "no-patient";
      patientCounts[pRef] = (patientCounts[pRef] || 0) + 1;
    });

    console.log("Categories found in first 50 results:", categories);
    console.log("Patient distribution in first 50 results:", patientCounts);

    const totalInSandbox = res.data.total;
    console.log("\nTotal DiagnosticReports in Sandbox:", totalInSandbox);

    // Check if there are multiple pages
    const hasNext = !!res.data.link?.find((l) => l.relation === "next");
    console.log("Has multiple pages?", hasNext);
  } catch (e) {
    console.error("Analysis Error:", e.message);
  }
}

analyzeFHIR();
