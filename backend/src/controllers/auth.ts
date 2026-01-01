import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/connection";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Joi from "joi";
import winston from "winston";

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log' }),
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
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

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

        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, jwtsecret, { expiresIn: "5h" });
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

        const token = jwt.sign({ userId: existingUser.id, email: existingUser.email }, jwtsecret, { expiresIn: "5h" });
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

        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;

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
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
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

        const newToken = jwt.sign({ userId: user.id, email: user.email }, jwtsecret, { expiresIn: "5h" });
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

