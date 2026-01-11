import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/connection";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Joi from "joi";
import winston from "winston";

// Logger configuration - optimized for Vercel serverless
// Vercel doesn't support file-based logging, so we use console only
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Always use console for Vercel (file logging doesn't work in serverless)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    })
});

// New signup-with-OTP validation schemas
const signupInitSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

const signupVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.length': 'OTP must be 6 digits',
    'string.pattern.base': 'OTP must be numeric'
  })
});

const signupCompleteSchema = Joi.object({
  email: Joi.string().email().required(),
  signupToken: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
    .required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

// OTP helpers for signup
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
let signupOtpTableReady = false;

const ensureSignupOtpTable = async () => {
  if (signupOtpTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signup_otps (
      email TEXT PRIMARY KEY,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  signupOtpTableReady = true;
};

const generateOtp = () => (Math.floor(100000 + Math.random() * 900000)).toString();

const createSignupTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendSignupOtp = async (req: Request, res: Response) => {
  let userEmail = '';
  try {
    const { error, value } = signupInitSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email } = value;
    userEmail = email;

    // Block if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    await ensureSignupOtpTable();

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO signup_otps (email, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (email)
       DO UPDATE SET otp_hash = EXCLUDED.otp_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()`,
      [email, otpHash, expiresAt]
    );

    const transporter = createSignupTransporter();
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your email for Spoonfeeder",
      text: `Your Spoonfeeder verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Hello,</p><p>Your Spoonfeeder verification code is <b>${otp}</b>.</p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p><p>If you didn't request this, you can ignore this email.</p>`
    });

    return res.status(200).json({ message: "OTP sent" });
  } catch (err) {
    logger.error("Signup OTP send error", { error: err, email: userEmail });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const verifySignupOtp = async (req: Request, res: Response) => {
  let userEmail = '';
  try {
    const { error, value } = signupVerifySchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, otp } = value;
    userEmail = email;
    await ensureSignupOtpTable();

    const rowRes = await pool.query("SELECT otp_hash, expires_at, attempts FROM signup_otps WHERE email = $1", [email]);
    if (rowRes.rows.length === 0) {
      return res.status(400).json({ error: "OTP not found. Please request a new code." });
    }

    const { otp_hash, expires_at, attempts } = rowRes.rows[0];

    if (attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Too many attempts. Please request a new code." });
    }

    if (new Date(expires_at) < new Date()) {
      await pool.query("DELETE FROM signup_otps WHERE email = $1", [email]);
      return res.status(400).json({ error: "OTP expired. Please request a new code." });
    }

    const matches = await bcrypt.compare(otp, otp_hash);
    if (!matches) {
      await pool.query("UPDATE signup_otps SET attempts = attempts + 1 WHERE email = $1", [email]);
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const jwtsecret = process.env.JWT_SECRET;
    if (!jwtsecret) return res.status(500).json({ error: "Server configuration error" });

    // Issue a short-lived signup token to be used for completing registration
    const signupToken = jwt.sign({ email, purpose: "signup" }, jwtsecret, { expiresIn: "15m" });

    // Clean up the OTP entry to prevent reuse
    await pool.query("DELETE FROM signup_otps WHERE email = $1", [email]);

    return res.status(200).json({ message: "OTP verified", signupToken });
  } catch (err) {
    logger.error("Signup OTP verify error", { error: err, email: userEmail });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const completeSignup = async (req: Request, res: Response) => {
  let userEmail = '';
  try {
    const { error, value } = signupCompleteSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password, signupToken } = value;
    userEmail = email;

    const jwtsecret = process.env.JWT_SECRET;
    if (!jwtsecret) return res.status(500).json({ error: "Server configuration error" });

    try {
      const payload = jwt.verify(signupToken, jwtsecret) as any;
      if (payload.purpose !== "signup" || payload.email !== email) {
        return res.status(400).json({ error: "Invalid signup token" });
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired signup token" });
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id,email",
      [email, passwordHash]
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, jwtsecret, { expiresIn: "12h" });
    return res.status(201).json({ message: "User registered", user: { id: newUser.id, email: newUser.email }, token });
  } catch (err) {
    logger.error("Complete signup error", { error: err, email: userEmail });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const register = async (_req: Request, res: Response) => {
    let userEmail = ''; // For error logging
    try {
        // Validate input - stripUnknown: true to remove any extra fields
        const { error, value } = registerSchema.validate(_req.body, { stripUnknown: true });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Extract only email and password (confirmPassword is validated but not stored)
        const { email, password } = value;
        userEmail = email;
        const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id,email",
            [email, passwordHash]
        );

        const newUser = result.rows[0];
        const jwtsecret = process.env.JWT_SECRET;
        if (!jwtsecret) return res.status(500).json({ error: "Server configuration error" });

        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, jwtsecret, { expiresIn: "12h" });
        return res.status(201).json({ message: "User registered", user: { id: newUser.id, email: newUser.email }, token });
    } catch (err) {
        logger.error("Registration error", {
            error: err,
            email: userEmail,
            ip: _req.ip
        });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const login = async (req: Request, res: Response) => {
    let userEmail = ''; // For error logging
    try {
        // Validate input - allowUnknown: true to ignore extra fields like confirmPassword
        const { error, value } = loginSchema.validate(req.body, { allowUnknown: true, stripUnknown: true });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email, password } = value;
        userEmail = email;

        const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Invalid email or password" });

        const existingUser = result.rows[0];
        const passwordMatches = await bcrypt.compare(password, existingUser.password_hash);
        if (!passwordMatches) return res.status(400).json({ error: "Invalid email or password" });

        const jwtsecret = process.env.JWT_SECRET;
        if (!jwtsecret) return res.status(500).json({ error: "Server configuration error" });

        const token = jwt.sign({ userId: existingUser.id, email: existingUser.email }, jwtsecret, { expiresIn: "12h" });
        return res.json({ message: "Login successful", user: { id: existingUser.id, email: existingUser.email }, token });
    } catch (err) {
        logger.error("Login error", {
            error: err,
            email: userEmail,
            ip: req.ip
        });
        return res.status(500).json({ error: "Internal server error" });
    }
};


// backend/src/controllers/auth.ts
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        // Validate input - stripUnknown: true to remove any extra fields
        const { error, value } = forgotPasswordSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { email } = value;

        const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: "Invalid Credentials" });
        }

        const userId = userRes.rows[0].id;
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await pool.query(
            "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1,$2,$3)",
            [userId, token, expiresAt]
        );

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const resetUrl = `${process.env.FRONTEND_URL || "https://spoonfeeders.vercel.app"}/reset-password?token=${token}`;

        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Reset your Spoonfeeder password",
            text: `You requested a password reset.\n\nReset your password using this link:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
            html: `
        <p>Hello,</p>
        <p>You requested a password reset for your Spoonfeeder account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link will expire in 60 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>— Spoonfeeder Team</p>
      `,
        });

        return res.status(200).json({ message: "Reset email sent" });
    } catch (err) {
        console.error("forgotPassword error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};


export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!token || !password) return res.status(400).json({ error: "Invalid request" });

        // Validate password strength
        const passwordSchema = Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                'any.required': 'Password is required'
            });

        const { error } = passwordSchema.validate(password);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const tokenRes = await pool.query("SELECT user_id, expires_at FROM password_resets WHERE token = $1", [token]);
        if (tokenRes.rows.length === 0) return res.status(400).json({ error: "Invalid or expired token" });

        const { user_id, expires_at } = tokenRes.rows[0];
        if (new Date(expires_at) < new Date()) {
            await pool.query("DELETE FROM password_resets WHERE token = $1", [token]);
            return res.status(400).json({ error: "Token expired" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, user_id]);

        await pool.query("DELETE FROM password_resets WHERE token = $1", [token]);

        const userRes = await pool.query("SELECT id, email FROM users WHERE id = $1", [user_id]);
        const user = userRes.rows[0];
        const jwtsecret = process.env.JWT_SECRET;
        if (!jwtsecret) return res.status(500).json({ error: "Server JWT config missing" });

        const newToken = jwt.sign({ userId: user.id, email: user.email }, jwtsecret, { expiresIn: "12h" });
        return res.json({
            message: "Password reset successful",
            token: newToken,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error("resetPassword error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

