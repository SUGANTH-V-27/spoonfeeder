import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/connection";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Joi from "joi";
import winston from "winston";
import otpStore, { OtpPurpose } from "../services/otpStore";

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

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const passwordResetInitSchema = Joi.object({
  email: Joi.string()
    .email()
    .pattern(/@gmail\.com$/i)
    .required()
    .messages({
      'string.email': 'Please provide a valid Email address',
      'string.pattern.base': 'Only Email addresses are allowed for password reset',
      'any.required': 'Email is required'
    })
});

const passwordResetVerifySchema = Joi.object({
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.length': 'OTP must be 6 digits',
    'string.pattern.base': 'OTP must be numeric'
  }),
  challengeToken: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords must match'
  })
});

// Stateless signup-with-OTP validation schemas
const signupInitSchema = Joi.object({
  email: Joi.string()
    .email()
    .pattern(/@gmail\.com$/i)
    .required()
    .messages({
      'string.email': 'Please provide a valid Email address',
      'string.pattern.base': 'Only Email addresses are allowed for signup',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
    .required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords must match'
  })
});

const signupVerifySchema = Joi.object({
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.length': 'OTP must be 6 digits',
    'string.pattern.base': 'OTP must be numeric'
  }),
  challengeToken: Joi.string().required()
});

// OTP helpers for signup
const OTP_EXPIRY_MINUTES = 10;
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

    const { email, password } = value;
    userEmail = email;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 10);

    // Clear any previous signup OTPs for this email
    otpStore.clearByEmail(email, "signup");
    const challengeToken = crypto.randomUUID();
    otpStore.set(challengeToken, {
      purpose: "signup",
      otpHash,
      expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      metadata: { email, passwordHash }
    });

    const transporter = createSignupTransporter();
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your email for Spoonfeeder",
      text: `Your Spoonfeeder verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Hello,</p><p>Your Spoonfeeder verification code is <b>${otp}</b>.</p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p><p>If you didn't request this, you can ignore this email.</p>`
    });

    return res.status(200).json({ message: "OTP sent", challengeToken, expiresInMinutes: OTP_EXPIRY_MINUTES });
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

    const { otp, challengeToken } = value;
    const record = otpStore.get(challengeToken);
    if (!record || record.purpose !== "signup") {
      return res.status(400).json({ error: "Invalid or expired signup token" });
    }

    const { metadata, expiresAt, attempts, maxAttempts, otpHash } = record;
    const email = metadata?.email;
    const passwordHash = metadata?.passwordHash;
    userEmail = email;

    if (!email || !passwordHash) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "Invalid signup state" });
    }

    if (Date.now() > expiresAt) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "OTP expired" });
    }

    if (attempts >= maxAttempts) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "Too many attempts. Please restart signup." });
    }

    const otpMatches = await bcrypt.compare(otp, otpHash);
    if (!otpMatches) {
      otpStore.incrementAttempts(challengeToken);
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "User already exists" });
    }

    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id,email",
      [email, passwordHash]
    );

    otpStore.delete(challengeToken);

    const newUser = result.rows[0];
    const jwtsecret = process.env.JWT_SECRET;
    if (!jwtsecret) return res.status(500).json({ error: "Server configuration error" });
    const token = jwt.sign({ userId: newUser.id, email: newUser.email }, jwtsecret, { expiresIn: "12h" });
    return res.status(201).json({ message: "User registered", user: { id: newUser.id, email: newUser.email }, token });
  } catch (err) {
    logger.error("Signup OTP verify error", { error: err, email: userEmail });
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

export const sendPasswordResetOtp = async (req: Request, res: Response) => {
  try {
    const { error, value } = passwordResetInitSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email } = value;
    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    // Clear previous reset OTPs for this email
    otpStore.clearByEmail(email, "password-reset");
    const challengeToken = crypto.randomUUID();
    otpStore.set(challengeToken, {
      purpose: "password-reset",
      otpHash,
      expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      metadata: { email }
    });

    const transporter = createSignupTransporter();
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset your Spoonfeeder password",
      text: `Your Spoonfeeder password reset code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Hello,</p><p>Your password reset code is <b>${otp}</b>.</p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p><p>If you didn't request this, you can ignore this email.</p>`
    });

    return res.status(200).json({ message: "OTP sent", challengeToken, expiresInMinutes: OTP_EXPIRY_MINUTES });
  } catch (err) {
    logger.error("Password reset OTP send error", { error: err });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyPasswordResetOtp = async (req: Request, res: Response) => {
  try {
    const { error, value } = passwordResetVerifySchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { otp, challengeToken, newPassword } = value;
    const record = otpStore.get(challengeToken);
    if (!record || record.purpose !== "password-reset") {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const { metadata, expiresAt, attempts, maxAttempts, otpHash } = record;
    const email = metadata?.email;
    if (!email) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "Invalid reset state" });
    }

    if (Date.now() > expiresAt) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "OTP expired" });
    }

    if (attempts >= maxAttempts) {
      otpStore.delete(challengeToken);
      return res.status(400).json({ error: "Too many attempts. Please restart reset." });
    }

    const otpMatches = await bcrypt.compare(otp, otpHash);
    if (!otpMatches) {
      otpStore.incrementAttempts(challengeToken);
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userRes.rows.length === 0) {
      otpStore.delete(challengeToken);
      return res.status(404).json({ error: "User not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userId = userRes.rows[0].id;
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);

    otpStore.delete(challengeToken);

    const jwtsecret = process.env.JWT_SECRET;
    if (!jwtsecret) return res.status(500).json({ error: "Server configuration error" });
    const token = jwt.sign({ userId, email }, jwtsecret, { expiresIn: "12h" });
    return res.json({ message: "Password reset successful", token, user: { id: userId, email } });
  } catch (err) {
    logger.error("Password reset OTP verify error", { error: err });
    return res.status(500).json({ error: "Internal server error" });
  }
};
