import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ADMIN_EMAILS = [
  'ruhankb29@gmail.com',
  'prasanthsri542@gmail.com',
  'sunshine.sankum@gmail.com',
  'suganthr09@gmail.com',
  'mkavin1106@gmail.com',
  'ssanthoshcse44@gmail.com',
  'nithi4527@gmail.com',
  'dnaveenprabu2007@gmail.com',
  'nithishkumar1642006@gmail.com',
  'sanjithsvpm@gmail.com'
];

interface JwtPayload {
  id: number;
  email: string;
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    if (!ADMIN_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    (req as any).user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
