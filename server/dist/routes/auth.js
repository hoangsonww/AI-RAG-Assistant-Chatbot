"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Sign Up a new user.
 *     description: Create a new user account with the provided email and password.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: yourpassword
 *     responses:
 *       200:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *       400:
 *         description: User already exists.
 *       500:
 *         description: Server error.
 */
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const newUser = new User_1.default({ email, password: hashedPassword });
        yield newUser.save();
        res.json({ message: "User created successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user.
 *     description: Authenticate a user with email and password and return a JWT token.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: yourpassword
 *     responses:
 *       200:
 *         description: Successfully authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: your.jwt.token
 *       400:
 *         description: Invalid credentials or user does not exist.
 *       500:
 *         description: Server error.
 */
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.json({ token });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify if an email exists.
 *     description: Checks whether a user with the specified email exists.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address to verify.
 *     responses:
 *       200:
 *         description: Email verification result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Email is required.
 *       500:
 *         description: Server error.
 */
router.get("/verify-email", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.query.email;
        if (!email || typeof email !== "string") {
            return res.status(400).json({ message: "Email is required" });
        }
        const user = yield User_1.default.findOne({ email });
        res.json({ exists: !!user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password.
 *     description: Resets the password for a user identified by the email.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               newPassword:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Email and new password are required, or user does not exist.
 *       500:
 *         description: Server error.
 */
router.post("/reset-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res
                .status(400)
                .json({ message: "Email and new password are required" });
        }
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        yield user.save();
        res.json({ message: "Password reset successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/auth/validate-token:
 *   get:
 *     summary: Validate the user's token.
 *     description: Checks if the token is still valid.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Token is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Token is invalid or expired.
 *       500:
 *         description: Server error.
 */
router.get("/validate-token", (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!token) {
            return res
                .status(401)
                .json({ valid: false, message: "No token provided" });
        }
        // @ts-ignore
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err) => {
            if (err) {
                return res
                    .status(401)
                    .json({ valid: false, message: "Invalid or expired token" });
            }
            return res.json({ valid: true });
        });
    }
    catch (error) {
        console.error("Error validating token:", error);
        res.status(500).json({ valid: false, message: "Internal server error" });
    }
});
exports.default = router;
