import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to authenticate JWT tokens.
 * Validates the token and attaches the user information to the request object.
 *
 * @param req The request object
 * @param res The response object
 * @param next The next middleware function
 */
export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: "Authorization header missing" });
  }
};
