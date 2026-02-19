const express = require("express");
const patientController = require("../../controller/patient/patientController");
const router = express.Router();

router.get(
  "/get-all-patients",
  patientController.getAllPatientsFromPracticeFusion,
);

router.get("/get-all-patients-from-db", patientController.getAllPatientsFromDB);

router.get("/get-patient-by-db-id/:id", patientController.getPatientByDbId);

module.exports = router;
