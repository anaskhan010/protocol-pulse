const express = require("express");
const db = require("./config/dbConnection");
const dotenv = require("dotenv");
const authMiddleware = require("./middlerware/authMiddleware/Auth");
const userRoute = require("./routes/userRoute/userRoute");
const roleRoute = require("./routes/roleRoutes/roleRoutes");
const studiesRoute = require("./routes/studiesRoute/studiesRoutes");
const cors = require("cors");
const cron = require("node-cron");
const studiesController = require("./controller/studies/studiesController");
const emailRoute = require("./routes/emailManagementRoute/emailRoutes");
const dashboardRoute = require("./routes/dashboard/dashboardRoute");
const emailNotificationService = require("./service/emailNotificationService");
const patientRoute = require("./routes/patients/patientRoute");

dotenv.config({ path: "./config/config.env" });

cron.schedule("*/3 * * * *", () => {
  console.log("Syncing studies...");
  studiesController.getAllStuduies();
});

// Run scheduled email alerts every 15 minutes
cron.schedule("* * * * *", () => {
  console.log("Checking for scheduled email alerts...");
  emailNotificationService.processScheduledAlerts();
});

const app = express();
app.use(express.static("public"));

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/patient", patientRoute);

app.use(authMiddleware);
app.use("/api/v1/role", roleRoute);
app.use("/api/v1/studies", studiesRoute);
app.use("/api/v1/email", emailRoute);
app.use("/api/v1/dashboard", dashboardRoute);

(async () => {
  try {
    await db.query("SELECT 1"); // DB connectivity test
    console.log("Database connected");

    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
})();
