const express = require("express");
const multer = require("multer");
const {
  createApplication,
  getApplication,
  updateSection,
  submitApplication,
  getReviewStatus,
  getSectionDetails,
  editSection,
  updateApplicationStatus,
  updateSectionNoAttachment,
  editSectionNoAttachment,
  addTradingPartners,
  getTradingPartners,
  updateTradingPartners,
  addApplicationStatus,getApplicationStatus,updateDeclarationForm // Import the new controller function
} = require("../controllers/liquidatorController");

const router = express.Router();
const upload = multer(); // Initialize multer

router.post("/application", createApplication); // Start application
router.get("/application/:user_id", getApplication); // Retrieve application
router.put(
  "/application/:id/section",
  upload.fields([
    { name: "id_document_file", maxCount: 1 }, // For Section 1
    { name: "membership_file", maxCount: 1 }, // For Section 6
    { name: "qualification_file", maxCount: 1 }, // For Section 6
    { name: "curriculum_vitae_file", maxCount: 1 }, // For Section 8
    { name: "tax_clearance_certificate_file", maxCount: 1 }, // For Section 9
    { name: "bank_account_proof_file", maxCount: 1 }, // For Section 9
    { name: "bond_facility_file", maxCount: 1 }, // For Section 9
  ]),
  updateSection
);

router.post("/application/:id/submit", submitApplication); // Submit application
router.get("/application/:id/status", getReviewStatus); // Get application status
router.get("/application/:id/section/:section", getSectionDetails);
router.put(
  "/application/:id/edit-section",
  upload.fields([
    { name: "id_document_file", maxCount: 1 }, // Section 1
    { name: "membership_file", maxCount: 1 }, // Section 6
    { name: "qualification_file", maxCount: 1 }, // Section 6
    { name: "curriculum_vitae_file", maxCount: 1 }, // Section 8
    { name: "tax_clearance_certificate_file", maxCount: 1 }, // Section 9
    { name: "bank_account_proof_file", maxCount: 1 }, // Section 9
    { name: "bond_facility_file", maxCount: 1 }, // Section 9
  ]),
  editSection
);

// Use upload middleware for file handling
router.put("/application-no-attachment/:id/section", updateSectionNoAttachment); // Update section

router.put("/application/status/:application_id", updateApplicationStatus);
router.put(
  "/application-no-attachment/:id/edit-section",
  editSectionNoAttachment
);

router.post("/tradingpartners", addTradingPartners);
router.get("/tradingpartners/:application_id", getTradingPartners);
router.put("/tradingpartners/:application_id", updateTradingPartners);

// New endpoint for adding application status
router.post("/submit-declaration-form/:application_id", addApplicationStatus);
router.get("/application-status/:application_id", getApplicationStatus);
router.put("/update-application-status/:application_id", updateDeclarationForm);


module.exports = router;
