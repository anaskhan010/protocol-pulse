const express = require("express");
const router = express.Router();
const dashboardController = require("../../controller/dashboard/dashboardController");
const dynamicUIController = require("../../controller/dashboard/dynamicUIController");

router.get("/stats", dashboardController.getDashboardStats);
router.get("/ui-config/:roleId", dynamicUIController.getUIConfig);
router.post("/ui-config/update", dynamicUIController.updateUIConfig);

module.exports = router;
