const express = require("express");
const router = express.Router();
const db = require("../config/db");
require("dotenv").config();
const PDFDocument = require("pdfkit");
const fs = require("fs");
const nodemailer = require("nodemailer");

/* Controller functions */

// 1. Create a new application
const createApplication = (req, res) => {
  const { user_id } = req.body;

  // Check if the user has ever created an application
  const checkExistingApplicationSql = `SELECT application_id FROM LiquidatorApplication WHERE user_id = ? LIMIT 1`;

  db.query(checkExistingApplicationSql, [user_id], (err, existingResult) => {
    console.log(err);
    if (err)
      return res
        .status(500)
        .json({ statusCode: 500, error: "Internal Server Error." });

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
      if (err)
        return res
          .status(500)
          .json({ statusCode: 500, error: "Internal Server Error." });

      const { opening_date, closing_date } = dateResult[0];
      const currentDate = new Date();

      if (
        currentDate < new Date(opening_date) ||
        currentDate > new Date(closing_date)
      ) {
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
          if (err)
            return res
              .status(500)
              .json({ statusCode: 500, error: "Internal Server Error." });

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
  console.log(user_id);

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
const updateSectionNoAttachment = (req, res) => {
  const { id } = req.params;
  const { section, data } = req.body;
  const sectionTable = getSectionTable(section);

  if (!sectionTable) {
    return res.status(400).json({ error: "Invalid section specified" });
  }

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

          db.query(
            `SELECT * FROM ${sectionTable} WHERE application_id = ?`,
            [id],
            (err, result) => {
              if (err) {
                console.error(
                  `Error retrieving updated data for section ${section}:`,
                  err.message
                );
                return res.status(500).json({
                  error: `Error retrieving updated data for section ${section}`,
                });
              }

              res.status(200).json({
                statusCode: 200,
                message: `Section ${section} updated successfully`,
                data: result[0],
              });
            }
          );
        }
      );
    }
  );
};

const updateSection = (req, res) => {
  const { id } = req.params; // application_id
  const section = req.body.section; // Section number passed as part of FormData
  const sectionTable = getSectionTable(section);

  console.log(`[DEBUG] Application ID: ${id}, Section: ${section}`); // Log application ID and section

  if (!sectionTable) {
    console.error(`[DEBUG] Invalid section specified: ${section}`);
    return res.status(400).json({ error: "Invalid section specified" });
  }

  // Initialize formattedData with default fields
  let formattedData = {
    ...req.body,
    application_id: id,
    is_completed: 1,
  };

  console.log("[DEBUG] Initial formattedData:", formattedData); // Log initial formattedData

  // Handle files based on section
  if (section === "1" && req.file) {
    formattedData.id_document_file = req.file.buffer; // Add binary file data
    formattedData.id_document_file_name = req.file.originalname; // Add file name

    console.log("[DEBUG] File Metadata:", {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    console.log("[DEBUG] File Buffer Length:", req.file.buffer.length);
  } else if (section === "1" && !req.file) {
    console.log("[DEBUG] No file uploaded for Section 1.");
  } else if (section === "6" && req.files) {
    // Section 6: Qualifications and Memberships
    if (req.files.membership_file) {
      formattedData.membership_file = req.files.membership_file[0].buffer;
      formattedData.membership_file_name =
        req.files.membership_file[0].originalname;
      console.log("[DEBUG] Membership File Details:", {
        fileName: req.files.membership_file[0].originalname,
        fileSize: req.files.membership_file[0].size,
      });
    }
    if (req.files.qualification_file) {
      formattedData.qualification_file = req.files.qualification_file[0].buffer;
      formattedData.qualification_file_name =
        req.files.qualification_file[0].originalname;
      console.log("[DEBUG] Qualification File Details:", {
        fileName: req.files.qualification_file[0].originalname,
        fileSize: req.files.qualification_file[0].size,
      });
    }
  } else if (section === "8" && req.files) {
    // Section 8: Curriculum Vitae
    if (req.files.curriculum_vitae_file) {
      formattedData.curriculum_vitae_file =
        req.files.curriculum_vitae_file[0].buffer;
      formattedData.curriculum_vitae_file_name =
        req.files.curriculum_vitae_file[0].originalname;
      console.log("[DEBUG] Curriculum Vitae File Details:", {
        fileName: req.files.curriculum_vitae_file[0].originalname,
        fileSize: req.files.curriculum_vitae_file[0].size,
      });
    }
  } else if (section === "9" && req.files) {
    // Section 9: Tax, Bank Account, and Bond Facility
    if (req.files.tax_clearance_certificate_file) {
      formattedData.tax_clearance_certificate_file =
        req.files.tax_clearance_certificate_file[0].buffer;
      formattedData.tax_clearance_certificate_file_name =
        req.files.tax_clearance_certificate_file[0].originalname;
      console.log("[DEBUG] Tax Clearance File Details:", {
        fileName: req.files.tax_clearance_certificate_file[0].originalname,
        fileSize: req.files.tax_clearance_certificate_file[0].size,
      });
    }
    if (req.files.bank_account_proof_file) {
      formattedData.bank_account_proof_file =
        req.files.bank_account_proof_file[0].buffer;
      formattedData.bank_account_proof_file_name =
        req.files.bank_account_proof_file[0].originalname;
      console.log("[DEBUG] Bank Account Proof File Details:", {
        fileName: req.files.bank_account_proof_file[0].originalname,
        fileSize: req.files.bank_account_proof_file[0].size,
      });
    }
    if (req.files.bond_facility_file) {
      formattedData.bond_facility_file = req.files.bond_facility_file[0].buffer;
      formattedData.bond_facility_file_name =
        req.files.bond_facility_file[0].originalname;
      console.log("[DEBUG] Bond Facility File Details:", {
        fileName: req.files.bond_facility_file[0].originalname,
        fileSize: req.files.bond_facility_file[0].size,
      });
    }
  }

  // Exclude 'section' field from formattedData
  delete formattedData.section;

  // Generate SQL query parts
  const fields = Object.keys(formattedData).join(", ");
  const placeholders = Object.keys(formattedData)
    .map(() => "?")
    .join(", ");
  const updateFields = Object.keys(formattedData)
    .map((key) => `${key} = ?`)
    .join(", ");
  const query = `
  INSERT INTO ${sectionTable} (${fields})
  VALUES (${placeholders})
  ON DUPLICATE KEY UPDATE ${updateFields}
`;

  const queryValues = [
    ...Object.values(formattedData), // For INSERT
    ...Object.values(formattedData), // For ON DUPLICATE KEY UPDATE
  ];

  console.log("[DEBUG] SQL Query:", query); // Log SQL query
  console.log("[DEBUG] Query Values:", queryValues); // Log query values

  db.query(query, queryValues, (err) => {
    if (err) {
      console.error(`[DEBUG] Error updating section ${section}:`, err.message);
      return res
        .status(500)
        .json({ error: `Error updating section ${section}` });
    }

    console.log(
      `[DEBUG] Section ${section} updated successfully in ${sectionTable}.`
    );

    db.query(
      `UPDATE LiquidatorApplication SET current_step = ?, last_saved_at = NOW() WHERE application_id = ?`,
      [section, id],
      (err) => {
        if (err) {
          console.error(
            "[DEBUG] Error updating application step:",
            err.message
          );
          return res
            .status(500)
            .json({ error: "Error updating application step" });
        }

        console.log("[DEBUG] Application step updated successfully.");

        db.query(
          `SELECT * FROM ${sectionTable} WHERE application_id = ?`,
          [id],
          (err, result) => {
            if (err) {
              console.error(
                `[DEBUG] Error retrieving updated data for section ${section}:`,
                err.message
              );
              return res.status(500).json({
                error: `Error retrieving updated data for section ${section}`,
              });
            }

            console.log("[DEBUG] Retrieved updated data:", result[0]);

            res.status(200).json({
              statusCode: 200,
              message: `Section ${section} updated successfully`,
              data: result[0],
            });
          }
        );
      }
    );
  });
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

const editSectionNoAttachment = (req, res) => {
  const { id } = req.params;
  const { section, data } = req.body;
  const sectionTable = getSectionTable(section);

  if (!sectionTable) {
    return res.status(400).json({ error: "Invalid section specified" });
  }

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

  const query = `UPDATE ${sectionTable} SET ${updateFields} WHERE application_id = ?`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error(`Error editing section ${section}:`, err.message);
      return res
        .status(500)
        .json({ error: `Error editing section ${section}` });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Section not found or no changes made" });
    }

    db.query(
      `SELECT * FROM ${sectionTable} WHERE application_id = ?`,
      [id],
      (err, updatedResult) => {
        if (err) {
          console.error(
            `Error retrieving updated data for section ${section}:`,
            err.message
          );
          return res.status(500).json({
            error: `Error retrieving updated data for section ${section}`,
          });
        }

        res.status(200).json({
          statusCode: 200,
          message: `Section ${section} updated successfully`,
          data: updatedResult[0], // Return the updated data
        });
      }
    );
  });
};

const editSection = (req, res) => {
  const { id } = req.params; // application_id

  const sectionTable = getSectionTable(req.body.section);
  if (!sectionTable) {
    return res.status(400).json({ error: "Invalid section specified" });
  }

  // Initialize formattedData with new data or an empty object
  const formattedData = req.body.data ? { ...req.body.data } : {};

  // Handle files based on the section
  if (req.body.section === "1" && req.file) {
    formattedData.id_document_file = req.file.buffer;
    formattedData.id_document_file_name = req.file.originalname;
  }

  if (req.body.section === "6" && req.files) {
    if (req.files.membership_file) {
      formattedData.membership_file = req.files.membership_file[0].buffer;
      formattedData.membership_file_name =
        req.files.membership_file[0].originalname;
    }

    if (req.files.qualification_file) {
      formattedData.qualification_file = req.files.qualification_file[0].buffer;
      formattedData.qualification_file_name =
        req.files.qualification_file[0].originalname;
    }
  }

  if (req.body.section === "8" && req.files) {
    if (req.files.curriculum_vitae_file) {
      formattedData.curriculum_vitae_file =
        req.files.curriculum_vitae_file[0].buffer;
      formattedData.curriculum_vitae_file_name =
        req.files.curriculum_vitae_file[0].originalname;
    }
  }

  if (req.body.section === "9" && req.files) {
    if (req.files.tax_clearance_certificate_file) {
      formattedData.tax_clearance_certificate_file =
        req.files.tax_clearance_certificate_file[0].buffer;
      formattedData.tax_clearance_certificate_file_name =
        req.files.tax_clearance_certificate_file[0].originalname;
    }

    if (req.files.bank_account_proof_file) {
      formattedData.bank_account_proof_file =
        req.files.bank_account_proof_file[0].buffer;
      formattedData.bank_account_proof_file_name =
        req.files.bank_account_proof_file[0].originalname;
    }

    if (req.files.bond_facility_file) {
      formattedData.bond_facility_file = req.files.bond_facility_file[0].buffer;
      formattedData.bond_facility_file_name =
        req.files.bond_facility_file[0].originalname;
    }
  }

  // Check and replace any existing values in formattedData with new values
  Object.keys(req.body).forEach((key) => {
    if (key !== "data" && key !== "section") {
      formattedData[key] = req.body[key];
    }
  });

  // Format array fields for SQL
  Object.keys(formattedData).forEach((key) => {
    if (Array.isArray(formattedData[key])) {
      formattedData[key] = formattedData[key].join(", ");
    }
  });

  // Ensure data is provided for the update
  if (Object.keys(formattedData).length === 0) {
    return res.status(400).json({ error: "No data provided to update" });
  }

  // Generate SQL query parts
  const updateFields = Object.keys(formattedData)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = [...Object.values(formattedData), id];

  // SQL query to update existing record
  const query = `UPDATE ${sectionTable} SET ${updateFields} WHERE application_id = ?`;

  db.query(query, values, (err, result) => {
    if (err) {
      console.error(`Error editing section:`, err.message);
      return res.status(500).json({ error: `Error editing section` });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Section not found or no changes made" });
    }

    // Retrieve updated data for confirmation
    db.query(
      `SELECT * FROM ${sectionTable} WHERE application_id = ?`,
      [id],
      (err, updatedResult) => {
        if (err) {
          console.error(`Error retrieving updated data:`, err.message);
          return res.status(500).json({
            error: `Error retrieving updated data`,
          });
        }

        res.status(200).json({
          statusCode: 200,
          message: `Section updated successfully`,
          data: updatedResult[0], // Return the updated data
        });
      }
    );
  });
};

// 7. Update or Retrieve Application Status
const updateApplicationStatus = (req, res) => {
  const { application_id } = req.params;
  const {
    review_status,
    outcome,
    reviewer_id,
    tax_clearance_private,
    tax_clearance_private_comment,
    tax_clearance_business,
    tax_clearance_business_comment,
    bond_facility,
    bond_facility_comment,
    banking_details,
    banking_details_comment,
    lease_agreement,
    lease_agreement_comment,
    id_document,
    id_document_comment,
    further_comments,
    applicant_name,
    applicant_email,
    comments,
  } = req.body;

  const applicantEmail = "applicant@example.com"; // Replace with dynamic email retrieval

  // Check if application exists
  const checkStatusSql = `SELECT * FROM ApplicationStatus WHERE application_id = ?`;

  db.query(checkStatusSql, [application_id], (err, result) => {
    if (err) {
      console.error("Error checking application status:", err.message);
      return res
        .status(500)
        .json({ error: "Error checking application status" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Function to create the PDF in memory
    const createPdf = (callback) => {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => callback(Buffer.concat(buffers)));

      const currentDate = new Date().toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const signaturePath = "C:/Users/Lutshes/Documents/signature.png"; // Ensure this path is correct
      const logoPath = "C:/Users/Lutshes/Documents/logo.jpg"; // Path to the uploaded logo

      try {
        doc
          .image(logoPath, 20, 20, { width: 200 }) // Removed the unnecessary semicolon
          .moveDown(4); // Move down after adding the logo
      } catch (error) {
        console.error("Error adding logo:", error.message);
      }

      // Header Section
      doc
        .font("Helvetica-Bold")
        .fontSize(11.5)
        .text("OFFICE OF THE CHIEF MASTER, PRETORIA", { align: "left" })
        .text("Private Bag X81, PRETORIA, 0001. SALU Building,", {
          align: "left",
        })
        .text("cnr Thabo Sehume & Francis Baard Street, PRETORIA", {
          align: "left",
        })
        .moveDown(1);

      // Applicant Details
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Name of Applicant: ", { continued: true, align: "left" }) // Bold font for label
        .font("Helvetica")
        .text(applicant_name) // Regular font for value
        .font("Helvetica-Bold") // Switch back to bold for the next label
        .moveDown(0.5)
        .text("Per email: ", { continued: true, align: "left" }) // Bold font for label
        .font("Helvetica")
        .text(applicant_email) // Regular font for value
        .font("Helvetica-Bold") // Switch back to bold for the next label
        .moveDown(0.5)
        .text("Date: ", { continued: true, align: "left" }) // Bold font for label
        .font("Helvetica")
        .text(currentDate) // Regular font for value
        .moveDown(1);

      // Greeting Section
      doc
        .font("Helvetica")
        .fontSize(11)
        .text("SIR/MADAM", { align: "left" })
        .moveDown(1);

      const currentYear = new Date().getFullYear();

      // Subject Line (Underlined)
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        // .underline()
        .text(
          `Re: Your application to be placed on the National List of Insolvency Practitioners – ${currentYear}`,
          { align: "left", underline: true }
        )
        .moveDown(2);

      // Body Content
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(
          "We acknowledge receipt of your Application form (Affidavit) and attachments thereto for placement on the National List of Insolvency Practitioners.",
          { align: "left" }
        )
        .moveDown(1)
        .text(
          "We regret to advise you that your application was unsuccessful as the documents lodged were not in order/insufficient. (The documents as marked below)",
          { align: "left" }
        )
        .moveDown(2);
        const drawTable = (doc, tableData) => {
          const startX = doc.page.margins.left; // Starting X position for the table
          let currentY = doc.y; // Starting Y position for the table
          const colWidths = [200, 100, 200]; // Column widths for "Document", "Not in Order", "Comment"
          const rowHeight = 20; // Height for each row, including header
        
          // Set line weight for the table borders
          doc.lineWidth(0.5);
        
          // Draw the header row
          drawRow(doc, startX, currentY, colWidths, rowHeight, {
            document: "Document",
            status: "Not in Order",
            comment: "Comment",
          }, true);
        
          // Move to the next row
          currentY += rowHeight;
        
          // Draw each data row
          tableData.forEach((row) => {
            drawRow(doc, startX, currentY, colWidths, rowHeight, row, false);
            currentY += rowHeight; // Move to the next row
          });
        
          // Ensure proper spacing below the table
          doc.y = currentY + 10;
        };
        
        // Helper function to draw a row
        const drawRow = (doc, startX, currentY, colWidths, rowHeight, row, isHeader) => {
          // Draw borders for the row
          doc
            .rect(startX, currentY, colWidths[0], rowHeight) // Border for "Document" column
            .rect(startX + colWidths[0], currentY, colWidths[1], rowHeight) // Border for "Not in Order" column
            .rect(startX + colWidths[0] + colWidths[1], currentY, colWidths[2], rowHeight) // Border for "Comment" column
            .stroke();
        
          // Font settings for header and data rows
          const font = isHeader ? "Helvetica-Bold" : "Helvetica";
          const fontSize = isHeader ? 11 : 10;
        
          // Draw text for each column
          doc.font(font).fontSize(fontSize).fill("#000");
          doc.text(row.document, startX + 5, currentY + 5, { width: colWidths[0] });
        
          if (isHeader || row.status === "X") {
            doc.font("Helvetica-Bold").text(row.status, startX + colWidths[0] + 5, currentY + 5, { width: colWidths[1] });
          } else {
            doc.font("Helvetica").text(row.status, startX + colWidths[0] + 5, currentY + 5, { width: colWidths[1] });
          }
        
          doc.font(font).text(row.comment, startX + colWidths[0] + colWidths[1] + 5, currentY + 5, { width: colWidths[2] });
        };
        
        // Example table data
        const tableData = [
          { document: "Application form (Affidavit)", status: "", comment: `${comments}` },
          { document: "Identity Copy", status: "", comment: `${id_document_comment}` },
          { document: "Tax Clearance - Personal", status: "", comment: `${tax_clearance_private_comment}` },
          { document: "Tax Clearance - Business", status: "", comment: `${tax_clearance_business_comment}` },
          { document: "Qualifications", status: "", comment: "" },
          { document: "Other", status: "", comment: `${comments}` },
        ];
        
        // Update the status dynamically based on the comment values
        tableData.forEach((row) => {
          row.status = row.comment.trim() !== "" ? "X" : "";
        });
        
        // Draw the table
        drawTable(doc, tableData);
        

      doc.x = 40;

      // Further Content (Additional Section)
      const nextYear = new Date().getFullYear() + 1;
      const nextMonthDate = new Date();
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1); // Add one month

      // Format the date in the desired format (e.g., "30th August 2024")
      const formattedDate = nextMonthDate.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      doc
        .font("Helvetica")
        .fontSize(11)
        .text(
          `You are encouraged to re-apply at the next intake which will re-open in ${nextYear}. Communication will be placed on our website with regard to the period for the re-opening of the intakes for ${nextYear}.`,
          { align: "left" }
        )
        .moveDown(1)
        .text(
          "Please ensure that you submit all the required documents as specified in the Application form (Affidavit).",
          { align: "left" }
        )
        .moveDown(1);
        doc
        .font("Helvetica-Bold")
        .fillColor("red")
        .text("https://www.justice.gov.za/master/m_forms/moh-insolv-AffidavitNEW-eForm.pdf", {
          align: "left",
          underline: true, // Underline only this part
          continued: true, // Keep the text on the same line
        })
        .text(". Same to be sent ONLY to the designated email address ", {
          underline: false, // No underline for this part
          continued: true, // Keep the text on the same line
        })
        .text("NewLiq@justice.gov.za", {
          underline: true, // Underline only this part
        })
        .moveDown(1);
      

      doc
        .fillColor("black")
        .font("Helvetica")
        .text(
          "Should you have any further queries, set out your queries in writing to ",
          { align: "left", continued: true }
        )
        .fillColor("red") // Set email text color to red
        .font("Helvetica")
        .text("NewLiq@justice.gov.za", { underline: true, continued: true }) // Red and underlined email
        .fillColor("black") // Revert to black for the rest of the text
        .font("Helvetica")
        .text(" by no later than ", { continued: true }) // Continue regular black text
        .font("Helvetica-Bold") // Bold text for the date
        .text(`${formattedDate}.`, { align: "left" }) // Bold black text
        .moveDown(2);

      // Closing Section
      doc
        .font("Helvetica")
        .fontSize(11)
        .text("Yours faithfully,", { align: "left" })
        .moveDown(0.5);

      // Add Signature
      try {
        doc.image(signaturePath, { fit: [150, 50], align: "left" }).moveDown(3);
      } catch (error) {
        console.error("Error adding signature:", error.message);
      }

      // Designation
      doc
        .font("Helvetica-Bold")
        .text("Chairperson of the Insolvency Working Group", { align: "left" })
        .text("o.b.o Office of the Chief Master", { align: "left" });

      doc.end();
    };

    // Send the email with the PDF
    const sendEmailWithAttachment = (pdfBuffer) => {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "sizwelutshete@gmail.com",
          pass: "ulky bodt pqze jlcn", // Use an app password for Gmail
        },
      });

      const mailOptions = {
        from: "sizwelutshete@gmail.com",
        to: "sizwelutshete@gmail.com",
        subject: `Application Status Update: Application ID ${application_id}`,
        text: `Dear Applicant,
      
      We are writing to provide you with an update regarding your application (ID: ${application_id}). The detailed response has been attached as a PDF document for your reference.
      
      Please review the attached document carefully for the status of your application. Should you have any questions or require further assistance, feel free to contact us at your earliest convenience.
      
      Thank you for your application.
      
      Best regards,
      [Your Team/Organization Name]`,
        attachments: [
          {
            filename: `${applicant_name}_ApplicationStatus.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      };
      

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Error sending email:", err.message);
          return res.status(500).json({ error: "Failed to send email" });
        }
        res.status(200).json({
          message: "PDF generated and email sent successfully.",
        });
      });
    };

    // Update application status
    const updateStatusSql = `
      UPDATE ApplicationStatus
      SET 
        review_status = ?,
        outcome = ?,
        reviewer_id = ?,
        tax_clearance_private = ?,
        tax_clearance_private_comment = ?,
        tax_clearance_business = ?,
        tax_clearance_business_comment = ?,
        bond_facility = ?,
        bond_facility_comment = ?,
        banking_details = ?,
        banking_details_comment = ?,
        lease_agreement = ?,
        lease_agreement_comment = ?,
        id_document = ?,
        id_document_comment = ?,
        further_comments = ?
      WHERE application_id = ?`;

    const statusValues = [
      review_status,
      outcome,
      reviewer_id,
      tax_clearance_private,
      tax_clearance_private_comment,
      tax_clearance_business,
      tax_clearance_business_comment,
      bond_facility,
      bond_facility_comment,
      banking_details,
      banking_details_comment,
      lease_agreement,
      lease_agreement_comment,
      id_document,
      id_document_comment,
      further_comments,
      application_id,
    ];

    db.query(updateStatusSql, statusValues, (err) => {
      if (err) {
        console.error("Error updating application status:", err.message);
        return res
          .status(500)
          .json({ error: "Error updating application status" });
      }

      // Generate and send PDF if rejected
      if (review_status === "Rejected") {
        createPdf((pdfBuffer) => {
          sendEmailWithAttachment(pdfBuffer);
        });
      } else {
        res
          .status(200)
          .json({ message: "Application status updated successfully" });
      }
    });
  });
};

// Helper function to update status in LiquidatorApplication table
function updateLiquidatorApplicationStatus(application_id, review_status, res) {
  const updateLiquidatorSql = `
    UPDATE LiquidatorApplication 
    SET status = ? 
    WHERE application_id = ?
  `;

  db.query(
    updateLiquidatorSql,
    [review_status, application_id],
    (err, result) => {
      if (err) {
        console.error(
          "Error updating LiquidatorApplication status:",
          err.message
        );
        return res.status(500).json({
          error: "Error updating application status in LiquidatorApplication",
        });
      }

      res.status(200).json({
        statusCode: 200,
        message: "Application reviewed and status updated successfully.",
        status: review_status,
      });
    }
  );
}

// Add Trading Partners
const addTradingPartners = (req, res) => {
  const { application_id, trading_partners } = req.body;

  if (
    !application_id ||
    !Array.isArray(trading_partners) ||
    trading_partners.length === 0
  ) {
    return res.status(400).json({
      error:
        "Invalid request. Ensure application_id and trading_partners are provided.",
    });
  }

  const values = trading_partners.map((partner) => [
    application_id,
    partner.name,
    partner.address,
  ]);

  const query = `
    INSERT INTO trading_partners (application_id, partner_name, partner_address)
    VALUES ?
  `;

  db.query(query, [values], (err, result) => {
    if (err) {
      console.error("Error adding trading partners:", err.message);
      return res.status(500).json({ error: "Error adding trading partners." });
    }

    res.status(201).json({
      statusCode: 201,
      message: "Trading partners added successfully.",
      data: result,
    });
  });
};

// Get Trading Partners
const getTradingPartners = (req, res) => {
  const { application_id } = req.params;

  const query = `
    SELECT partner_name AS name, partner_address AS address 
    FROM trading_partners 
    WHERE application_id = ?
  `;

  db.query(query, [application_id], (err, result) => {
    if (err) {
      console.error("Error retrieving trading partners:", err.message);
      return res
        .status(500)
        .json({ error: "Error retrieving trading partners." });
    }

    res.status(200).json({
      statusCode: 200,
      tradingPartners: result,
    });
  });
};

// Update Trading Partners
const updateTradingPartners = (req, res) => {
  const { application_id } = req.params;
  const { trading_partners } = req.body;

  if (!Array.isArray(trading_partners) || trading_partners.length === 0) {
    return res.status(400).json({
      error: "Invalid request. Provide trading_partners as an array.",
    });
  }

  // Delete existing trading partners for the application
  const deleteQuery = `DELETE FROM trading_partners WHERE application_id = ?`;

  db.query(deleteQuery, [application_id], (err) => {
    if (err) {
      console.error("Error deleting old trading partners:", err.message);
      return res
        .status(500)
        .json({ error: "Error updating trading partners." });
    }

    // Insert updated trading partners
    const values = trading_partners.map((partner) => [
      application_id,
      partner.name,
      partner.address,
    ]);
    const insertQuery = `
      INSERT INTO trading_partners (application_id, partner_name, partner_address)
      VALUES ?
    `;

    db.query(insertQuery, [values], (err, result) => {
      if (err) {
        console.error("Error updating trading partners:", err.message);
        return res
          .status(500)
          .json({ error: "Error updating trading partners." });
      }

      // Retrieve the newly added trading partners
      const retrieveQuery = `SELECT partner_name AS name, partner_address AS address FROM trading_partners WHERE application_id = ?`;

      db.query(retrieveQuery, [application_id], (err, addedData) => {
        if (err) {
          console.error("Error retrieving trading partners:", err.message);
          return res
            .status(500)
            .json({ error: "Error retrieving trading partners." });
        }

        res.status(200).json({
          statusCode: 200,
          message: "Trading partners updated successfully.",
          updatedRows: result.affectedRows,
          tradingPartners: addedData, // Include the newly added data
        });
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

const addApplicationStatus = (req, res) => {
  const { application_id } = req.params; // Extract application_id from route params
  const {
    review_status = "Draft", // Default status
    outcome = null,
    reviewer_id = null,
    tax_clearance_private = null,
    tax_clearance_business = null,
    bond_facility = null,
    banking_details = null,
    lease_agreement = null,
    id_document = null,
    further_comments = null,
    tax_clearance_private_comment = null,
    tax_clearance_business_comment = null,
    bond_facility_comment = null,
    banking_details_comment = null,
    lease_agreement_comment = null,
    id_document_comment = null,
  } = req.body;

  // Validate application_id
  if (!application_id) {
    return res.status(400).json({
      error: "Invalid request. Ensure application_id is provided in the URL.",
    });
  }

  const query = `
    INSERT INTO applicationstatus (
      application_id,
      review_status,
      outcome,
      reviewer_id,
      tax_clearance_private,
      tax_clearance_business,
      bond_facility,
      banking_details,
      lease_agreement,
      id_document,
      further_comments,
      tax_clearance_private_comment,
      tax_clearance_business_comment,
      bond_facility_comment,
      banking_details_comment,
      lease_agreement_comment,
      id_document_comment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    application_id,
    review_status,
    outcome,
    reviewer_id,
    tax_clearance_private,
    tax_clearance_business,
    bond_facility,
    banking_details,
    lease_agreement,
    id_document,
    further_comments,
    tax_clearance_private_comment,
    tax_clearance_business_comment,
    bond_facility_comment,
    banking_details_comment,
    lease_agreement_comment,
    id_document_comment,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error adding application status:", err.message);
      return res.status(500).json({
        error: "Error adding application status. Please try again later.",
      });
    }

    res.status(201).json({
      statusCode: 201,
      message: "Application status added successfully.",
      insertedId: result.insertId,
    });
  });
};

const getApplicationStatus = (req, res) => {
  const { application_id } = req.params;

  // Validate input
  if (!application_id) {
    return res.status(400).json({
      error: "Invalid request. Ensure application_id is provided.",
    });
  }

  const query = `
    SELECT * 
    FROM applicationstatus 
    WHERE application_id = ?
  `;

  db.query(query, [application_id], (err, results) => {
    if (err) {
      console.error("Error retrieving application status:", err.message);
      return res.status(500).json({
        error: "Error retrieving application status. Please try again later.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "No application status found for the provided application_id.",
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: "Application status retrieved successfully.",
      data: results[0],
    });
  });
};

const updateDeclarationForm = (req, res) => {
  const { application_id } = req.params; // Extract application_id from route params
  const {
    review_status, // Required to be provided for updates
    outcome = null,
    reviewer_id = null,
    tax_clearance_private = null,
    tax_clearance_business = null,
    bond_facility = null,
    banking_details = null,
    lease_agreement = null,
    id_document = null,
    further_comments = null,
    tax_clearance_private_comment = null,
    tax_clearance_business_comment = null,
    bond_facility_comment = null,
    banking_details_comment = null,
    lease_agreement_comment = null,
    id_document_comment = null,
  } = req.body;

  // Validate required fields
  if (!application_id || !review_status) {
    return res.status(400).json({
      error:
        "Invalid request. Ensure application_id and review_status are provided.",
    });
  }

  const query = `
    UPDATE applicationstatus
    SET
      review_status = ?,
      outcome = ?,
      reviewer_id = ?,
      tax_clearance_private = ?,
      tax_clearance_business = ?,
      bond_facility = ?,
      banking_details = ?,
      lease_agreement = ?,
      id_document = ?,
      further_comments = ?,
      tax_clearance_private_comment = ?,
      tax_clearance_business_comment = ?,
      bond_facility_comment = ?,
      banking_details_comment = ?,
      lease_agreement_comment = ?,
      id_document_comment = ?,
      updated_at = NOW()
    WHERE application_id = ?
  `;

  const values = [
    review_status,
    outcome,
    reviewer_id,
    tax_clearance_private,
    tax_clearance_business,
    bond_facility,
    banking_details,
    lease_agreement,
    id_document,
    further_comments,
    tax_clearance_private_comment,
    tax_clearance_business_comment,
    bond_facility_comment,
    banking_details_comment,
    lease_agreement_comment,
    id_document_comment,
    application_id,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error updating application status:", err.message);
      return res.status(500).json({
        error: "Error updating application status. Please try again later.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "No record found with the provided application_id.",
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: "Application status updated successfully.",
      updatedRows: result.affectedRows,
    });
  });
};

module.exports = {
  createApplication,
  getApplication,
  updateSection,
  updateSectionNoAttachment,
  submitApplication,
  getReviewStatus,
  getSectionDetails,
  editSection,
  updateApplicationStatus,
  editSectionNoAttachment,
  addTradingPartners,
  getTradingPartners,
  updateTradingPartners,
  addApplicationStatus,
  getApplicationStatus,
  updateDeclarationForm,
};
