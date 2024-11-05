const express = require("express");
const router = express.Router();
const db = require("../config/db");
require("dotenv").config();

/* Controller functions */

// 1. Create a new application
const createApplication = (req, res) => {
    const { user_id } = req.body;
  
    // Check if the user has ever created an application
    const checkExistingApplicationSql = `SELECT application_id FROM LiquidatorApplication WHERE user_id = ? LIMIT 1`;
  
    db.query(checkExistingApplicationSql, [user_id], (err, existingResult) => {
        console.log(err)
      if (err) return res.status(500).json({ statusCode: 500, error: "Internal Server Error." });
  
      // If an application already exists, prevent the user from creating another
      if (existingResult.length > 0) {
        return res.status(200).json({
          statusCode: 200,         
          existingApplication: existingResult[0], // Return the existing application data
        });
      }
      
  
      // Check the opening and closing dates
      const checkDatesSql = `SELECT opening_date, closing_date FROM LiquidatorApplicationSettings LIMIT 1`;
  
      db.query(checkDatesSql, [], (err, dateResult) => {
        if (err) return res.status(500).json({ statusCode: 500, error: "Internal Server Error." });
  
        const { opening_date, closing_date } = dateResult[0];
        const currentDate = new Date();
  
        if (currentDate < new Date(opening_date) || currentDate > new Date(closing_date)) {
          return res.status(403).json({
            statusCode: 403,
            message: "Application form is currently closed.",
          });
        }
  
        // Create a new application for the user
        const createApplicationSql = `INSERT INTO LiquidatorApplication (user_id, status, current_step, opening_date, closing_date)
                                        VALUES (?, 'Draft', 1, ?, ?)`;
  
        db.query(
          createApplicationSql,
          [user_id, opening_date, closing_date],
          (err, result) => {
            if (err) return res.status(500).json({ statusCode: 500, error: "Internal Server Error." });
  
            const applicationId = result.insertId;
            res.status(201).json({
              statusCode: 201,
              message: "Your new application has been successfully created.",
              applicationId,
            });
          }
        );
      });
    });
  };
  

// 2. Retrieve an application by ID
const getApplication = (req, res) => {
    const { user_id } = req.params;
    console.log(user_id)
  
    db.query(
      `SELECT * FROM LiquidatorApplication WHERE user_id = ?`,
      [user_id],
      (err, result) => {
        if (err) {
          console.error("Error retrieving application:", err.message);
          return res.status(500).json({ error: "Error retrieving application" });
        }
        if (result.length === 0)
          return res.status(404).json({ message: "Application not found" });
  
        res.status(200).json(result[0]);
      }
    );
  };
  

// 3. Update specific section in the application
const updateSection = (req, res) => {
    const { id } = req.params;
    const { section, data } = req.body;
    const sectionTable = getSectionTable(section);
  
    if (!sectionTable) {
      return res.status(400).json({ error: "Invalid section specified" });
    }
  
    // Convert array fields to comma-separated strings if needed
    const formattedData = { ...data };
    Object.keys(formattedData).forEach((key) => {
      if (Array.isArray(formattedData[key])) {
        formattedData[key] = formattedData[key].join(", ");
      }
    });
  
    const fields = Object.keys(formattedData).join(", ");
    const placeholders = Object.values(formattedData)
      .map(() => "?")
      .join(", ");
    const updateFields = Object.keys(formattedData)
      .map((key) => `${key} = ?`)
      .join(", ");
  
    const query = `
          INSERT INTO ${sectionTable} (application_id, ${fields}, is_completed)
          VALUES (?, ${placeholders}, ?)
          ON DUPLICATE KEY UPDATE ${updateFields}, is_completed = ?
      `;
  
    db.query(
      query,
      [
        id,
        ...Object.values(formattedData),
        1,
        ...Object.values(formattedData),
        1,
      ],
      (err) => {
        if (err) {
          console.error(`Error updating section ${section}:`, err.message);
          return res
            .status(500)
            .json({ error: `Error updating section ${section}` });
        }
  
        // Update the current step and last saved timestamp in LiquidatorApplication table
        db.query(
          `UPDATE LiquidatorApplication SET current_step = ?, last_saved_at = NOW() WHERE application_id = ?`,
          [section, id],
          (err) => {
            if (err) {
              console.error("Error updating application step:", err.message);
              return res
                .status(500)
                .json({ error: "Error updating application step" });
            }
  
            // Fetch the newly inserted or updated data
            db.query(
              `SELECT * FROM ${sectionTable} WHERE application_id = ?`,
              [id],
              (err, result) => {
                if (err) {
                  console.error(`Error retrieving updated data for section ${section}:`, err.message);
                  return res
                    .status(500)
                    .json({ error: `Error retrieving updated data for section ${section}` });
                }
  
                // Return success message with the updated data
                res.status(200).json({
                  statusCode: 200,
                  message: `Section ${section} updated successfully`,
                  data: result[0] // Return the first (and expected only) result
                });
              }
            );
          }
        );
      }
    );
  };
  

// 4. Submit the application
const submitApplication = (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT opening_date, closing_date FROM LiquidatorApplication WHERE application_id = ?`,
    [id],
    (err, result) => {
      if (err) {
        console.error("Error retrieving application dates:", err.message);
        return res
          .status(500)
          .json({ error: "Error retrieving application dates" });
      }

      if (result.length === 0)
        return res.status(404).json({ message: "Application not found" });

      const { opening_date, closing_date } = result[0];
      const currentDate = new Date();

      if (
        currentDate < new Date(opening_date) ||
        currentDate > new Date(closing_date)
      ) {
        return res
          .status(403)
          .json({ message: "Application submission period is closed." });
      }

      db.query(
        `UPDATE LiquidatorApplication SET status = 'Submitted' WHERE application_id = ?`,
        [id],
        (err) => {
          if (err) {
            console.error("Error submitting application:", err.message);
            return res
              .status(500)
              .json({ error: "Error submitting application" });
          }

          res
            .status(200)
            .json({ message: "Application submitted successfully" });
        }
      );
    }
  );
};

// 5. Check review status
const getReviewStatus = (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT * FROM ApplicationStatus WHERE application_id = ?`,
    [id],
    (err, result) => {
      if (err) {
        console.error("Error retrieving review status:", err.message);
        return res
          .status(500)
          .json({ error: "Error retrieving review status" });
      }
      if (result.length === 0)
        return res.status(404).json({ message: "Status not found" });

      res.status(200).json(result[0]);
    }
  );
};

// 6. View a specific section's details
const getSectionDetails = (req, res) => {
  const { id, section } = req.params;
  const sectionTable = getSectionTable(section);

  if (!sectionTable)
    return res.status(400).json({ error: "Invalid section specified" });

  db.query(
    `SELECT * FROM ${sectionTable} WHERE application_id = ?`,
    [id],
    (err, result) => {
      if (err) {
        console.error(
          `Error retrieving section ${section} details:`,
          err.message
        );
        return res
          .status(500)
          .json({ error: `Error retrieving section ${section} details` });
      }
      if (result.length === 0)
        return res.status(404).json({ message: "Section details not found" });

      res.status(200).json(result[0]);
    }
  );
};


const editSection = (req, res) => {
    const { id } = req.params; // application_id
    const { section, data } = req.body;
    const sectionTable = getSectionTable(section);

    if (!sectionTable) {
      return res.status(400).json({ error: "Invalid section specified" });
    }
  
    // Format data for SQL update
    const formattedData = { ...data };
    Object.keys(formattedData).forEach((key) => {
      if (Array.isArray(formattedData[key])) {
        formattedData[key] = formattedData[key].join(", ");
      }
    });
  
    const updateFields = Object.keys(formattedData)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = [...Object.values(formattedData), id];
  
    // SQL query to update existing record
    const query = `UPDATE ${sectionTable} SET ${updateFields} WHERE application_id = ?`;
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error(`Error editing section ${section}:`, err.message);
        return res.status(500).json({ error: `Error editing section ${section}` });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Section not found or no changes made" });
      }
  
      // Optionally retrieve the updated data to return in response
      db.query(`SELECT * FROM ${sectionTable} WHERE application_id = ?`, [id], (err, updatedResult) => {
        if (err) {
          console.error(`Error retrieving updated data for section ${section}:`, err.message);
          return res.status(500).json({ error: `Error retrieving updated data for section ${section}` });
        }
  
        res.status(200).json({
          statusCode: 200,
          message: `Section ${section} updated successfully`,
          data: updatedResult[0], // Return the updated data
        });
      });
    });
  };
  


/* Helper function */
function getSectionTable(section) {
  const sectionMap = {
    1: "personalinfo",
    2: "VerificationBusinessInfo",
    3: "EmploymentBusinessTrading",
    4: "businessinfrastructuredetails",
    5: "officeaddresses",
    6: "qualificationsprofessionalmemberships",
    7: "DisqualificationRelationship",
    8: "AppointmentEmploymentHistory",
    9: "TaxBondBankDocumentation",
  };
  return sectionMap[section] || null;
}

module.exports = {
  createApplication,
  getApplication,
  updateSection,
  submitApplication,
  getReviewStatus,
  getSectionDetails,
  editSection
};
