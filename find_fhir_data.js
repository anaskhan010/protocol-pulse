const axios = require("axios");

async function findData() {
  const BASE_URL = "https://r4.smarthealthit.org";
  try {
    console.log("Searching for DiagnosticReports with patient references...");
    const res = await axios.get(`${BASE_URL}/DiagnosticReport?_count=10`);
    const entries = res.data.entry || [];

    for (const entry of entries) {
      const report = entry.resource;
      const patientRef = report.subject?.reference;
      console.log(`Report ${report.id} -> ${patientRef}`);
    }

    console.log("\nSearching for ImagingStudies with patient references...");
    const resImg = await axios.get(`${BASE_URL}/ImagingStudy?_count=10`);
    const imgEntries = resImg.data.entry || [];

    for (const entry of imgEntries) {
      const study = entry.resource;
      const patientRef = study.subject?.reference;
      console.log(`Study ${study.id} -> ${patientRef}`);
    }
  } catch (e) {
    console.error(e.message);
  }
}

findData();
