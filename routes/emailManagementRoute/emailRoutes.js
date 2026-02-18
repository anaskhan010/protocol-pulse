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
} = require("../../controller/emailManamentController/emailController");

router.post("/createSendEmailAlerts", createSendEmailAlerts);
router.get("/getEmailType", getEmailType);
router.get("/getFrequency", getFrequency);
router.get("/getSendEmailAlertsByUserId", getSendEmailAlertsByUserId);
router.put("/updateSendEmailAlerts", updateSendEmailAlerts);
router.delete("/deleteSendEmailAlerts", deleteSendEmailAlerts);
router.get("/getAllConditions", getAllConditions);
module.exports = router;
