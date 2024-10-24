const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Helper function to send OTP
const sendOTP = (email, otp) => {
    console.log(email, otp);
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'sizwelutshete@gmail.com', //process.env.EMAIL_USER,
            pass: 'ulky bodt pqze jlcn' //process.env.EMAIL_PASS
        },
        secure: true,  // Force use of SSL/TLS
        port: 465,     // Gmail's secure SMTP port
        host: 'smtp.gmail.com'
    });

    const mailOptions = {
        from: 'sizwelutshete@gmail.com',//process.env.EMAIL_USER,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp}`
    };

    return transporter.sendMail(mailOptions);
};

// Register user with OTP
const otpExpirationTime = () => {
    const now = new Date();
    return new Date(now.getTime() + 10 * 60000); // OTP valid for 10 minutes
};

exports.registerUser = async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

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
                await sendOTP(email, otp);
                res.status(201).json({ message: 'User registered. OTP sent to email.' });
            } catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Failed to send OTP' });
            }
        });
    });
};


// Verify OTP
exports.verifyOTP = (req, res) => {
    const { email, otp } = req.body;

    // Step 1: Check if the user exists
    const getUserSql = 'SELECT id FROM users WHERE email = ?';
    db.query(getUserSql, [email], (err, userResult) => {
        if (err || userResult.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const userId = userResult[0].id;

        // Step 2: Check the OTP validity and expiration
        const otpSql = `SELECT otp, otpExpiresAt, isUsed FROM otps 
                        WHERE userId = ? AND otp = ? AND otpPurpose = 'email_verification'`;
        db.query(otpSql, [userId, otp], (otpErr, otpResult) => {
            if (otpErr || otpResult.length === 0) {
                return res.status(400).json({ error: 'Invalid OTP' });
            }

            const { otpExpiresAt, isUsed } = otpResult[0];

            // Step 3: Check if OTP has expired
            const now = new Date();
            if (now > otpExpiresAt) {
                return res.status(400).json({ error: 'OTP has expired' });
            }

            // Step 4: Check if OTP has already been used
            if (isUsed) {
                return res.status(400).json({ error: 'OTP has already been used' });
            }

            // Step 5: Update the user's verification status
            const verifyUserSql = 'UPDATE users SET isVerified = true, verifiedAt = NOW() WHERE id = ?';
            db.query(verifyUserSql, [userId], (verifyErr) => {
                if (verifyErr) {
                    return res.status(500).json({ error: 'Verification failed' });
                }

                // Step 6: Mark the OTP as used
                const markOtpUsedSql = 'UPDATE otps SET isUsed = true WHERE userId = ? AND otp = ?';
                db.query(markOtpUsedSql, [userId, otp], (markErr) => {
                    if (markErr) {
                        return res.status(500).json({ error: 'Could not mark OTP as used' });
                    }

                    // Success response
                    res.json({ message: 'User verified successfully' });
                });
            });
        });
    });
};


//resend otp
exports.resendOTP = (req, res) => {
    const { email } = req.body;

    const getUserSql = 'SELECT id, isVerified FROM users WHERE email = ?';
    db.query(getUserSql, [email], (err, userResult) => {
        if (err || userResult.length === 0) return res.status(400).json({ error: 'User not found' });

        const { id: userId, isVerified } = userResult[0];
        if (isVerified) return res.status(400).json({ error: 'User is already verified' });

        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpiresAt = otpExpirationTime(); // New expiration time

        const updateOtpSql = `UPDATE otps SET otp = ?, otpExpiresAt = ? 
                              WHERE userId = ? AND otpPurpose = 'email_verification'`;
        db.query(updateOtpSql, [otp, otpExpiresAt, userId], async (otpErr) => {
            if (otpErr) return res.status(500).json({ error: 'Failed to resend OTP' });

            try {
                await sendOTP(email, otp);
                res.json({ message: 'OTP resent to email.' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to send OTP' });
            }
        });
    });
};



// Login user
exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ? AND isVerified = true';
    db.query(sql, [email], async (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

        const user = results[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
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


