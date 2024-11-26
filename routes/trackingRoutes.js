// routes/trackingRoutes.js
const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');


router.get('/applications', trackingController.getAllApplications);
router.get('/applications/filter', trackingController.filterApplications);
router.get('/applications/:application_id', trackingController.getApplicationDetails);
router.get('/applications/:application_id/review-status', trackingController.getReviewStatus);
router.get('/period', trackingController.getCurrentPeriod);
router.get('/summary', trackingController.getSummaryData);
router.get('/application/:id/details', trackingController.getSubmittedApplicationDetails);

module.exports = router;
