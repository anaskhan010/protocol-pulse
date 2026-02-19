const axios = require("axios");

async function testBatch() {
  const BASE_URL = "https://r4.smarthealthit.org";
  // These are some random IDs that usually exist in the sandbox
  const ids = [
    "87a339d0-8cae-418e-89c7-8651e6aab3c6",
    "58afd732-6804-406e-8274-1e0e8e60ee78",
  ];

  console.log("Testing with patient=id1,id2...");
  try {
    const res1 = await axios.get(
      `${BASE_URL}/DiagnosticReport?patient=${ids.join(",")}&_count=5`,
    );
    console.log(
      "Response 1 Total:",
      res1.data.total,
      "Entries:",
      res1.data.entry?.length || 0,
    );
  } catch (e) {
    console.log("Error 1:", e.message);
  }

  console.log("\nTesting with patient=Patient/id1,Patient/id2...");
  try {
    const res2 = await axios.get(
      `${BASE_URL}/DiagnosticReport?patient=Patient/${ids[0]},Patient/${ids[1]}&_count=5`,
    );
    console.log(
      "Response 2 Total:",
      res2.data.total,
      "Entries:",
      res2.data.entry?.length || 0,
    );
  } catch (e) {
    console.log("Error 2:", e.message);
  }
}

testBatch();
