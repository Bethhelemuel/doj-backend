const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Helper function to send OTP
const sendOTP = (email, otp, type, userInfo = {}) => {
    console.log(email, otp);

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'sizwelutshete@gmail.com', // Use environment variables for security
            pass: 'ulky bodt pqze jlcn'      // Use process.env.EMAIL_PASS in production
        },
        secure: true,  // Use SSL/TLS
        port: 465,     // Gmail's secure SMTP port
        host: 'smtp.gmail.com'
    });

    let mailOptions;

    if (type === 'OTP Verification') {
        mailOptions = {
            from: 'sizwelutshete@gmail.com', // Use process.env.EMAIL_USER in production
            to: email,
            subject: 'Your OTP Verification Code',
            text: `Dear User,\n\nYour OTP code is: ${otp}.\n\nPlease enter this code to complete your verification.\n\nThank you,\nYour Application Team`
        };

    } else if (type === 'Admin Approval') {
        const { requesterName, requesterSurname, requesterEmail, userId } = userInfo;

        const acceptUrl =  `http://localhost:4200/approval-status?userId=${userId}&action=approveUser`;
        const declineUrl = `http://localhost:4200/approval-status?userId=${userId}&action=declineUser`;
        
        mailOptions = {
            from: 'sizwelutshete@gmail.com', // Use process.env.EMAIL_USER in production
            to: email,
            subject: 'Admin Approval Required for Official Account',
            html: `
                <p>Approval request from:</p>
                <p>Name: ${requesterName} ${requesterSurname}</p>
                <p>Email: ${requesterEmail}</p>
                <br/>
                <p>Actions:</p>
                <a href="${acceptUrl}" style="color:green; text-decoration:none; padding: 10px; background-color:#4CAF50; color: white;">Accept</a>
                <a href="${declineUrl}" style="color:red; text-decoration:none; padding: 10px; background-color:#f44336; color: white;">Decline</a>
            `
        };

    } else if (type === 'Approval Granted') {
        mailOptions = {
            from: 'sizwelutshete@gmail.com',
            to: email,
            subject: 'Your Account Approval Status',
            text: `Dear ${userInfo.requesterName},\n\nYour account has been successfully approved by the admin.\n\nThank you for your patience.\n\nBest regards,\nYour Application Team`
        };

    } else if (type === 'Approval Declined') {
        mailOptions = {
            from: 'sizwelutshete@gmail.com',
            to: email,
            subject: 'Your Account Approval Status',
            text: `Dear ${userInfo.requesterName},\n\nUnfortunately, your account approval request was declined by the admin.\n\nFor further details, please contact support.\n\nBest regards,\nYour Application Team`
        };
    }

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('Email sent: ' + info.response);
        })
        .catch(error => {
            console.error('Error sending email:', error);
        });
};




// Register user with OTP
const otpExpirationTime = () => {
    const now = new Date();
    return new Date(now.getTime() + 10 * 60000); // OTP valid for 10 minutes
};



exports.registerUser = async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if the user already exists
    const checkUserSql = 'SELECT * FROM users WHERE email = ?';
    db.query(checkUserSql, [email], async (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // If user with the same email already exists
        if (result.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // If no user exists, proceed to register the user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiresAt = otpExpirationTime(); // OTP expiration time

        const sql = `INSERT INTO users (firstName, lastName, email, password, role, isVerified)
                     VALUES (?, ?, ?, ?, ?, false)`;

        db.query(sql, [firstName, lastName, email, hashedPassword, role], (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            const userId = result.insertId;

            // Insert OTP into the otps table
            const otpSql = `INSERT INTO otps (userId, otp, otpPurpose, otpExpiresAt)
                            VALUES (?, ?, 'email_verification', ?)`;
            db.query(otpSql, [userId, otp, otpExpiresAt], async (otpErr) => {
                if (otpErr) return res.status(500).json({ error: 'OTP generation failed' });

                try {
                    if (role === 'officials') {
                        // Send email to admin with user info for approval
                        await sendOTP('sizwelutshete@gmail.com', null, 'Admin Approval', {
                            requesterName: firstName,
                            requesterSurname: lastName,
                            requesterEmail: email,
                            requesterRole: role
                        });
                        res.status(201).json({ message: 'User registered. Awaiting admin approval.' });
                    } else {
                        // Send OTP to the user's email
                        await sendOTP(email, otp, 'OTP Verification');
                        res.status(201).json({ message: 'User registered. OTP sent to email.' });
                    }
                } catch (error) {
                    console.log(error);
                    res.status(500).json({ message: 'Failed to send email, Please double-check your email' });
                }
            });
        });
    });
};




// Verify OTP
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    // Step 1: Check if the user exists and retrieve role information
    const getUserSql = 'SELECT id, role, firstName, lastName FROM users WHERE email = ?';
    db.query(getUserSql, [email], async (err, userResult) => {
        if (err || userResult.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const { id: userId, role: userRole, firstName, lastName } = userResult[0];

        // Step 2: Check OTP validity
        const otpSql = `SELECT otp, otpExpiresAt, isUsed FROM otps WHERE userId = ? AND otp = ? AND otpPurpose = 'email_verification'`;
        db.query(otpSql, [userId, otp], async (otpErr, otpResult) => {
            if (otpErr || otpResult.length === 0) {
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            const { otpExpiresAt, isUsed } = otpResult[0];
            const now = new Date();

            if (now > otpExpiresAt || isUsed) {
                return res.status(400).json({ message: 'OTP has expired or already been used' });
            }

            if (userRole === 'official') {
                try {
                    await sendOTP('sizwelutshete@gmail.com', otp, 'Admin Approval', {
                        requesterName: firstName,
                        requesterSurname: lastName,
                        requesterEmail: email,
                        userId
                    });
                    res.json({ message: 'Verification request sent to admin for approval' });
                } catch (emailErr) {
                    res.status(500).json({ message: 'Failed to send email to admin' });
                }
            } else {
                // Verification for non-official users
                const verifyUserSql = 'UPDATE users SET isVerified = true, verifiedAt = NOW() WHERE id = ?';
                db.query(verifyUserSql, [userId], (verifyErr) => {
                    if (verifyErr) return res.status(500).json({ message: 'Verification failed' });

                    const markOtpUsedSql = 'UPDATE otps SET isUsed = true WHERE userId = ? AND otp = ?';
                    db.query(markOtpUsedSql, [userId, otp], (markErr) => {
                        if (markErr) return res.status(500).json({ message: 'Could not mark OTP as used' });

                        res.json({ message: 'User verified successfully' });
                    });
                });
            }
        });
    });
};








//resend otp
exports.resendOTP = (req, res) => {
    const { email } = req.body;

    const getUserSql = 'SELECT id, isVerified, firstName, lastName, role FROM users WHERE email = ?';
    db.query(getUserSql, [email], (err, userResult) => {
        if (err || userResult.length === 0) return res.status(400).json({ error: 'User not found' });

        const { id: userId, isVerified, firstName, lastName, role } = userResult[0];
        if (isVerified) return res.status(400).json({ error: 'User is already verified' });

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiresAt = otpExpirationTime(); // New expiration time

        const updateOtpSql = `UPDATE otps SET otp = ?, otpExpiresAt = ? 
                              WHERE userId = ? AND otpPurpose = 'email_verification'`;
        db.query(updateOtpSql, [otp, otpExpiresAt, userId], async (otpErr) => {
            if (otpErr) return res.status(500).json({ error: 'Failed to resend OTP' });

            try {
                if (role === 'officials') {
                    // Send email to admin with user info for approval
                    await sendOTP('admin@example.com', null, 'Admin Approval', {
                        requesterName: firstName,
                        requesterSurname: lastName,
                        requesterEmail: email,
                        requesterRole: role
                    });
                    res.json({ message: 'Approval request sent to admin.' });
                } else {
                    // Resend OTP to the user's email
                    await sendOTP(email, otp, 'OTP Verification');
                    res.json({ message: 'OTP resent to email.' });
                }
            } catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Failed to send email' });
            }
        });
    });
};




// Login user
exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ? AND isVerified = true';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0)  return res.status(400).json({ message: 'Email or password is incorrect. Please check your credentials and try again.' });

        const user = results[0];
        
        console.log(user);
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(400).json({ message: 'Email or password is incorrect. Please check your credentials and try again.' });

        const token = jwt.sign({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.json({ token, message: 'Login successful' });
    });
};


exports.requestPasswordReset = (req, res) => {
    const { email } = req.body;

    const getUserSql = 'SELECT id FROM users WHERE email = ?';
    db.query(getUserSql, [email], (err, userResult) => {
        if (err || userResult.length === 0) return res.status(400).json({ error: 'User not found' });

        const userId = userResult[0].id;
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiresAt = otpExpirationTime();

        const insertOtpSql = `INSERT INTO otps (userId, otp, otpPurpose, otpExpiresAt) 
                              VALUES (?, ?, 'password_reset', ?)`;
        db.query(insertOtpSql, [userId, otp, otpExpiresAt], async (otpErr) => {
            if (otpErr) return res.status(500).json({ error: 'Failed to generate OTP' });

            try {
                await sendOTP(email, otp);
                res.json({ message: 'OTP sent to email for password reset.' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to send OTP' });
            }
        });
    });
};



// Approve User API
exports.approveUser = async (req, res) => {
    const { userId } = req.query;

    const verifyUserSql = 'UPDATE users SET isVerified = true, verifiedAt = NOW() WHERE id = ?';
    db.query(verifyUserSql, [userId], (err) => {
        if (err) return res.status(500).json({ message: 'Approval process failed' });

        // Notify user of approval
        const getUserSql = 'SELECT email, firstName, lastName FROM users WHERE id = ?';
        db.query(getUserSql, [userId], async (err, result) => {
            if (err || result.length === 0) return res.status(400).json({ message: 'User not found' });

            const userEmail = result[0].email;
            const userInfo = {
                requesterName: result[0].firstName,
                requesterSurname: result[0].lastName
            };
            await sendOTP('sizwelutshete@gmail.com', null, 'Approval Granted', userInfo);
            res.json({ message: 'User approved and notified' });
        });
    });
};

// Decline User API
exports.declineUser = async (req, res) => {
    const { userId } = req.query;
 

    const getUserSql = 'SELECT email, firstName FROM users WHERE id = ?';
    db.query(getUserSql, [userId], async (err, result) => {
        if (err || result.length === 0) return res.status(400).json({ message: 'User not found' });

        const userEmail = result[0].email;
        const userInfo = {
            requesterName: result[0].firstName,
          
        };
        await sendOTP('sizwelutshete@gmail.com', null, 'Approval Declined', userInfo);
        res.json({ message: 'User decline notification sent' });
    });
};





