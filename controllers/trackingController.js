// controllers/trackingController.js
const db = require("../config/db");

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 1. Get all applications with basic tracking information
const getAllApplications = (req, res) => {
  const query = `
      SELECT la.application_id, la.user_id, la.status, la.current_step, 
             la.opening_date, la.closing_date, 
             CONCAT(u.firstName, ' ', u.lastName) AS practitioner_name,
             u.email, u.contactNumber AS contact_number,
             (SELECT review_status FROM ApplicationStatus WHERE application_id = la.application_id ORDER BY updated_at DESC LIMIT 1) AS overall_status
      FROM LiquidatorApplication la
      JOIN Users u ON la.user_id = u.id
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching applications:", err.message);
      return res.status(500).json({ error: "Error fetching applications" });
    }
    res.status(200).json(results);
  });
};

// 2. Filter applications by status, opening date, and closing date
// 3. Filter Applications with Search and Filter Criteria
const filterApplications = (req, res) => {
  const { search, status, openingDate, closingDate } = req.query;

  let query = `
        SELECT la.application_id, CONCAT(u.firstName, ' ', u.lastName) AS practitioner_name, 
               u.email, u.contactNumber AS contact_number, la.status, la.current_step,
               (SELECT outcome FROM ApplicationStatus WHERE application_id = la.application_id ORDER BY updated_at DESC LIMIT 1) AS latest_outcome
        FROM LiquidatorApplication la
        JOIN Users u ON la.user_id = u.id
        WHERE 1=1
    `;
  const queryParams = [];

  if (search) {
    query += ` AND (u.firstName LIKE ? OR u.lastName LIKE ? OR la.application_id LIKE ?)`;
    const searchParam = `%${search}%`;
    queryParams.push(searchParam, searchParam, searchParam);
  }
  if (status) {
    query += ` AND la.status = ?`;
    queryParams.push(status);
  }
  if (openingDate) {
    query += ` AND la.opening_date >= ?`;
    queryParams.push(openingDate);
  }
  if (closingDate) {
    query += ` AND la.closing_date <= ?`;
    queryParams.push(closingDate);
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error filtering applications:", err.message);
      return res.status(500).json({ error: "Error filtering applications" });
    }
    res.status(200).json(results);
  });
};

// 3. Get detailed tracking information for a specific application
const getApplicationDetails = (req, res) => {
  const { application_id } = req.params;

  const query = `
      SELECT la.*, u.firstName, u.lastName,
             (SELECT outcome FROM ApplicationStatus WHERE application_id = la.application_id ORDER BY updated_at DESC LIMIT 1) AS latest_outcome
      FROM LiquidatorApplication la
      JOIN Users u ON la.user_id = u.id
      WHERE la.application_id = ?
    `;

  db.query(query, [application_id], (err, results) => {
    if (err) {
      console.error("Error fetching application details:", err.message);
      return res
        .status(500)
        .json({ error: "Error fetching application details" });
    }
    if (results.length === 0)
      return res.status(404).json({ message: "Application not found" });

    res.status(200).json(results[0]);
  });
};

// 4. Retrieve review status for tracking
const getReviewStatus = (req, res) => {
  const { application_id } = req.params;

  const query = `
      SELECT * FROM ApplicationStatus 
      WHERE application_id = ?
      ORDER BY updated_at DESC
    `;

  db.query(query, [application_id], (err, results) => {
    if (err) {
      console.error("Error fetching review status:", err.message);
      return res.status(500).json({ error: "Error fetching review status" });
    }
    if (results.length === 0)
      return res.status(404).json({ message: "Review status not found" });

    res.status(200).json(results);
  });
};

// 1. Get Current Application Period
const getCurrentPeriod = (req, res) => {
  const query = `SELECT opening_date, closing_date FROM LiquidatorApplicationSettings LIMIT 1`;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching application period:", err.message);
      return res
        .status(500)
        .json({ error: "Error fetching application period" });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Application period not found" });
    }
    res
      .status(200)
      .json({
        opening_date: formatDate(result[0].opening_date),
        closing_date: formatDate(result[0].closing_date),
      });
  });
};

// 2. Get Summary Data
const getSummaryData = (req, res) => {
  const query = `
          SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN review_status = 'Draft' THEN 1 ELSE 0 END) AS draft,
                SUM(CASE WHEN review_status = 'Submitted' THEN 1 ELSE 0 END) AS submitted,
                SUM(CASE WHEN review_status = 'Reviewed' THEN 1 ELSE 0 END) AS reviewed,
                SUM(CASE WHEN review_status = 'Approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN review_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
            FROM applicationstatus
    `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching summary data:", err.message);
      return res.status(500).json({ error: "Error fetching summary data" });
    }
    const summary = {
        total: Number(result[0].total),
        draft: Number(result[0].draft),
        submitted: Number(result[0].submitted),
        reviewed: Number(result[0].reviewed),
        approved: Number(result[0].approved),
        rejected: Number(result[0].rejected),
    };
    res.status(200).json(summary);
  });
};


const getSubmittedApplicationDetails = (req, res) => {
    const { id } = req.params;
    const query = `
      SELECT 
        -- Personal Information
        pi.full_name, 
        pi.identity_number, 
        pi.race, 
        pi.gender,
        
        -- Business Information
        vbi.business_type, 
        vbi.business_status,
        
        -- Qualifications and Professional Memberships
        qpm.qualifications, 
        qpm.professional_memberships,
        qpm.qualification_file_name,
        qpm.qualification_file,
        qpm.membership_file_name,
        qpm.membership_file, 
        
        -- Business Infrastructure Details
        bid.proof_of_rental, 
        bid.staff_details, 
        bid.num_computers, 
        bid.num_printers, 
        bid.additional_info,
        
        -- Disqualification Provision and Relationship Disclosure
        dr.disqualification_details, 
        dr.relationship_disclosure, 
        dr.relationship_details,
        
        -- Appointment and Employment History
        aeh.appointment_locations, 
        aeh.employment_history,
        
        -- Tax Clearance, Bond Facility, and Bank Account Documentation
       -- tbb.tax_clearance_certificate, 
       -- tbb.bank_account_proof, 
        tbb.declaration_agreement,
        
        -- Contact Information and Application Status
        u.contactNumber, 
        u.email,
        la.status AS application_status
  
      FROM personalinfo pi
      LEFT JOIN verificationbusinessinfo vbi ON pi.application_id = vbi.application_id
      LEFT JOIN qualificationsprofessionalmemberships qpm ON pi.application_id = qpm.application_id
      LEFT JOIN businessinfrastructuredetails bid ON pi.application_id = bid.application_id
      LEFT JOIN disqualificationrelationship dr ON pi.application_id = dr.application_id
      LEFT JOIN appointmentemploymenthistory aeh ON pi.application_id = aeh.application_id
      LEFT JOIN taxbondbankdocumentation tbb ON pi.application_id = tbb.application_id
      LEFT JOIN liquidatorapplication la ON pi.application_id = la.application_id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE pi.application_id = ?;
    `;
  
    db.query(query, [id], (err, result) => {
      console.log(result)
      if (err) {
        console.log(err)
        console.error("Error fetching submitted application details:", err.message);
        return res.status(500).json({ error: "Error fetching submitted application details" });
      }
      if (result.length === 0) {
        return res.status(404).json({ message: "Application details not found" });
      }
  
      // Structure response with all sections
      const response = {
        personalInformation: {
          fullName: result[0].full_name,
          identityNumber: result[0].identity_number,
          race: result[0].race,
          gender: result[0].gender,
        },
        businessInformation: {
          businessType: result[0].business_type,
          businessStatus: result[0].business_status,
         

        },
        qualifications: {
          qualifications: result[0].qualifications,
          professionalMemberships: result[0].professional_memberships,
          qualification_file_name:result[0].qualification_file_name,
          qualification_file:result[0].qualification_file,

          membership_file_name:result[0].membership_file_name,
          membership_file:result[0].membership_file
        },
        businessInfrastructure: {
          proofOfRental: result[0].proof_of_rental,
          staffDetails: result[0].staff_details,
          numComputers: result[0].num_computers,
          numPrinters: result[0].num_printers,
          additionalInfo: result[0].additional_info,
        },
        disqualificationRelationship: {
          disqualificationDetails: result[0].disqualification_details,
          relationshipDisclosure: result[0].relationship_disclosure,
          relationshipDetails: result[0].relationship_details,
        },
        appointmentEmploymentHistory: {
          appointmentLocations: result[0].appointment_locations,
          employmentHistory: result[0].employment_history,
        },
        taxBondBankDocumentation: {
          taxClearanceCertificate: result[0].tax_clearance_certificate,
          bankAccountProof: result[0].bank_account_proof,
          declarationAgreement: result[0].declaration_agreement,
        },
        contactInformation: {
          contactNumber: result[0].contactNumber,
          email: result[0].email,
        },
        applicationStatus: result[0].application_status
      };
  
      res.status(200).json(response);
    });
  };
  
  

module.exports = {
  getAllApplications,
  filterApplications,
  getApplicationDetails,
  getReviewStatus,
  getCurrentPeriod,
  getSummaryData,
  getSubmittedApplicationDetails
};
