import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthPayload {
  id: number;
  email: string;
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1) Read the Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  //jwt secret from enviromental variables
  const jwtsecret = process.env.JWT_SECRET;

  if(!jwtsecret){
    console.error("JWT SECRET is not set in environment variable!");
    return res.status(500).json({error:"Server configuration error"});
  }

  const token = authHeader.split(" ")[1]; // get the part after "Bearer"

  try {
    // 2) Verify the token
    const decoded = jwt.verify(
      token,
      jwtsecret
    ) as AuthPayload;

    // 3) Attach user info to req for later handlers
    (req as any).user = decoded;

    // 4) Continue to the next middleware/route
    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};