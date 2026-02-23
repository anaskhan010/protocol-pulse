const express = require("express");
const router = express.Router();

const {
  createSendEmailAlerts,
  getEmailType,
  getFrequency,
  getSendEmailAlertsByUserId,
  updateSendEmailAlerts,
  deleteSendEmailAlerts,
  getAllConditions,
  getAllPhases,
  getAllLocations,
  getSendEmailAlertsById,
} = require("../../controller/emailManamentController/emailController");

router.post("/createSendEmailAlerts", createSendEmailAlerts);
router.get("/getEmailType", getEmailType);
router.get("/getFrequency", getFrequency);
router.get("/getSendEmailAlertsByUserId", getSendEmailAlertsByUserId);
router.put("/updateSendEmailAlerts", updateSendEmailAlerts);
router.delete("/deleteSendEmailAlerts", deleteSendEmailAlerts);
router.get("/getAllConditions", getAllConditions);
router.get("/getAllPhases", getAllPhases);
router.get("/getAllLocations", getAllLocations);
router.get("/getSendEmailAlertsById/:alert_id", getSendEmailAlertsById);
module.exports = router;
