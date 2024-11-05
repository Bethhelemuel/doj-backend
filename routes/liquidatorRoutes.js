const express = require('express');
const {
    createApplication,
    getApplication,
    updateSection,
    submitApplication,
    getReviewStatus,
    getSectionDetails,
    editSection
} = require('../controllers/liquidatorController');
const router = express.Router();

router.post('/application', createApplication); // Start application
router.get('/application/:user_id', getApplication); // Retrieve application
router.put('/application/:id/section', updateSection); // Update section
router.post('/application/:id/submit', submitApplication); // Submit application
router.get('/application/:id/status', getReviewStatus); // Get application status
router.get('/application/:id/section/:section', getSectionDetails);
router.put("/application/:id/edit-section", editSection);

module.exports = router;


