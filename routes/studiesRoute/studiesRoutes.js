const express = require("express");
const router = express.Router();
const {
  getStudies,
  getStudyById,
} = require("../../controller/studies/studiesController");

router.get("/getStudies", getStudies);
router.get("/getStudyById/:id", getStudyById);

module.exports = router;
