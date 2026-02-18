const express = require("express");
const router = express.Router();
const dashboardController = require("../../controller/dashboard/dashboardController");

router.get("/stats", dashboardController.getDashboardStats);

module.exports = router;
