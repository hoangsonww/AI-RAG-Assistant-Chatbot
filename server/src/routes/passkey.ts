import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import User, { IUser, IPasskeyCredential } from "../models/User";
import Challenge from "../models/Challenge";
import { authenticateJWT, AuthRequest } from "../middleware/auth";

dotenv.config();

const router = express.Router();

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_NAME = process.env.WEBAUTHN_RP_NAME || "Lumina AI";
const EXPECTED_ORIGINS = (
  process.env.WEBAUTHN_EXPECTED_ORIGIN || "http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (
  process.env.NODE_ENV === "production" &&
  (RP_ID === "localhost" ||
    EXPECTED_ORIGINS.some((o) => o.startsWith("http://localhost")))
) {
  console.warn(
    "[passkey] WARNING: WEBAUTHN_RP_ID/WEBAUTHN_EXPECTED_ORIGIN look like dev defaults. " +
      "Set them to your production domain or passkeys will fail with origin mismatch.",
  );
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function bufferToBase64Url(buf: Uint8Array | Buffer): string {
  return Buffer.from(buf).toString("base64url");
}

function base64UrlToBuffer(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function issueJwt(user: IUser): string {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" },
  );
}

function publicCredentialView(c: IPasskeyCredential) {
  return {
    credentialID: c.credentialID,
    nickname: c.nickname,
    transports: c.transports || [],
    deviceType: c.deviceType,
    backedUp: c.backedUp,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  };
}

/**
 * @swagger
 * /api/auth/passkey/register/options:
 *   post:
 *     summary: Begin passkey registration
 *     description: Generate WebAuthn registration options for the authenticated user. Requires a valid Bearer JWT.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: Optional friendly label saved when the credential is verified.
 *     responses:
 *       200:
 *         description: Registration options + opaque challengeId.
 *       401:
 *         description: Authorization header missing.
 *       403:
 *         description: Invalid token.
 *       404:
 *         description: User not found.
 */
router.post(
  "/register/options",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: user._id.toString(),
        userName: user.email,
        userDisplayName: user.email,
        attestationType: "none",
        excludeCredentials: user.credentials.map((c) => ({
          id: base64UrlToBuffer(c.credentialID),
          type: "public-key",
          transports: (c.transports || []) as any,
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      const challengeDoc = await Challenge.create({
        challenge: options.challenge,
        type: "registration",
        userId: user._id.toString(),
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      });

      return res.json({
        options,
        challengeId: challengeDoc._id.toString(),
      });
    } catch (err: any) {
      console.error("Passkey register options error:", err.message);
      return res.status(500).json({ message: "Failed to start registration" });
    }
  },
);

/**
 * @swagger
 * /api/auth/passkey/register/verify:
 *   post:
 *     summary: Complete passkey registration
 *     description: Verify the WebAuthn registration response and persist the new credential.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeId
 *               - response
 *             properties:
 *               challengeId:
 *                 type: string
 *               nickname:
 *                 type: string
 *               response:
 *                 type: object
 *                 description: RegistrationResponseJSON from @simplewebauthn/browser.
 *     responses:
 *       200:
 *         description: Credential registered.
 *       400:
 *         description: Invalid or expired challenge, or verification failed.
 */
router.post(
  "/register/verify",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { challengeId, response, nickname } = req.body || {};

      if (!challengeId || !response) {
        return res
          .status(400)
          .json({ message: "challengeId and response are required" });
      }

      const challengeDoc = await Challenge.findById(challengeId);
      if (
        !challengeDoc ||
        challengeDoc.type !== "registration" ||
        challengeDoc.userId !== String(userId) ||
        challengeDoc.expiresAt.getTime() < Date.now()
      ) {
        if (challengeDoc) await challengeDoc.deleteOne();
        return res
          .status(400)
          .json({ message: "Invalid or expired challenge" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Consume the challenge first so it cannot be replayed even if
      // verification throws (malformed payloads will throw inside the lib).
      const expectedChallenge = challengeDoc.challenge;
      await challengeDoc.deleteOne();

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response,
          expectedChallenge,
          expectedOrigin: EXPECTED_ORIGINS,
          expectedRPID: RP_ID,
          requireUserVerification: false,
        });
      } catch (err: any) {
        return res
          .status(400)
          .json({ message: err?.message || "Passkey verification failed" });
      }

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ message: "Passkey verification failed" });
      }

      const {
        credentialID,
        credentialPublicKey,
        counter,
        credentialDeviceType,
        credentialBackedUp,
      } = verification.registrationInfo;

      const credentialIDStr = bufferToBase64Url(credentialID);

      const duplicate = user.credentials.find(
        (c) => c.credentialID === credentialIDStr,
      );
      if (duplicate) {
        return res.status(400).json({ message: "Passkey already registered" });
      }

      user.credentials.push({
        credentialID: credentialIDStr,
        publicKey: bufferToBase64Url(credentialPublicKey),
        counter,
        transports: response?.response?.transports || [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        nickname:
          typeof nickname === "string" ? nickname.slice(0, 60) : undefined,
        createdAt: new Date(),
      });
      await user.save();

      const created = user.credentials[user.credentials.length - 1];
      return res.json({
        ok: true,
        credential: publicCredentialView(created),
      });
    } catch (err: any) {
      console.error("Passkey register verify error:", err.message);
      return res.status(500).json({ message: "Failed to verify registration" });
    }
  },
);

/**
 * @swagger
 * /api/auth/passkey/login/options:
 *   post:
 *     summary: Begin passkey login
 *     description: Generate WebAuthn authentication options. If `email` is provided the user's credentials are listed; otherwise discoverable (usernameless) login is requested.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Authentication options + opaque challengeId.
 */
router.post("/login/options", async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};

    let allowCredentials:
      | Array<{ id: Buffer; type: "public-key"; transports?: any[] }>
      | undefined;
    let scopedUserId: string | undefined;

    if (email && typeof email === "string") {
      const user = await User.findOne({ email });
      if (user && user.credentials.length > 0) {
        scopedUserId = user._id.toString();
        allowCredentials = user.credentials.map((c) => ({
          id: base64UrlToBuffer(c.credentialID),
          type: "public-key",
          transports: (c.transports || []) as any,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      // Omit allowCredentials entirely for discoverable login — passing []
      // is interpreted by some browsers as "no credential allowed".
      ...(allowCredentials ? { allowCredentials } : {}),
      userVerification: "preferred",
    });

    const challengeDoc = await Challenge.create({
      challenge: options.challenge,
      type: "authentication",
      userId: scopedUserId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    });

    return res.json({
      options,
      challengeId: challengeDoc._id.toString(),
    });
  } catch (err: any) {
    console.error("Passkey login options error:", err.message);
    return res.status(500).json({ message: "Failed to start login" });
  }
});

/**
 * @swagger
 * /api/auth/passkey/login/verify:
 *   post:
 *     summary: Complete passkey login
 *     description: Verify the WebAuthn authentication response and return a JWT.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeId
 *               - response
 *             properties:
 *               challengeId:
 *                 type: string
 *               response:
 *                 type: object
 *                 description: AuthenticationResponseJSON from @simplewebauthn/browser.
 *     responses:
 *       200:
 *         description: JWT issued.
 *       400:
 *         description: Invalid challenge or verification failed.
 */
router.post("/login/verify", async (req: Request, res: Response) => {
  try {
    const { challengeId, response } = req.body || {};
    if (!challengeId || !response) {
      return res
        .status(400)
        .json({ message: "challengeId and response are required" });
    }

    const challengeDoc = await Challenge.findById(challengeId);
    if (
      !challengeDoc ||
      challengeDoc.type !== "authentication" ||
      challengeDoc.expiresAt.getTime() < Date.now()
    ) {
      if (challengeDoc) await challengeDoc.deleteOne();
      return res.status(400).json({ message: "Invalid or expired challenge" });
    }

    const credentialIdB64 = response.id;
    if (!credentialIdB64 || typeof credentialIdB64 !== "string") {
      await challengeDoc.deleteOne();
      return res.status(400).json({ message: "Malformed credential" });
    }

    let user: IUser | null = null;
    if (challengeDoc.userId) {
      user = await User.findById(challengeDoc.userId);
    } else {
      const userHandle = response?.response?.userHandle;
      if (userHandle && typeof userHandle === "string") {
        const decoded = base64UrlToBuffer(userHandle).toString("utf8");
        if (decoded.match(/^[a-f0-9]{24}$/)) {
          user = await User.findById(decoded);
        }
      }
      if (!user) {
        user = await User.findOne({
          "credentials.credentialID": credentialIdB64,
        });
      }
    }

    if (!user) {
      await challengeDoc.deleteOne();
      return res.status(400).json({ message: "Unknown credential" });
    }

    const stored = user.credentials.find(
      (c) => c.credentialID === credentialIdB64,
    );
    if (!stored) {
      await challengeDoc.deleteOne();
      return res.status(400).json({ message: "Unknown credential" });
    }

    // Consume the challenge before verifying so a malformed payload that
    // throws inside the WebAuthn lib still leaves no replayable challenge.
    const expectedChallenge = challengeDoc.challenge;
    await challengeDoc.deleteOne();

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGINS,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: base64UrlToBuffer(stored.credentialID),
          credentialPublicKey: base64UrlToBuffer(stored.publicKey),
          counter: stored.counter,
          transports: (stored.transports || []) as any,
        },
        requireUserVerification: false,
      });
    } catch (err: any) {
      return res
        .status(400)
        .json({ message: err?.message || "Passkey verification failed" });
    }

    if (!verification.verified) {
      return res.status(400).json({ message: "Passkey verification failed" });
    }

    stored.counter = verification.authenticationInfo.newCounter;
    stored.lastUsedAt = new Date();
    await user.save();

    const token = issueJwt(user);
    return res.json({ token });
  } catch (err: any) {
    console.error("Passkey login verify error:", err.message);
    return res.status(500).json({ message: "Failed to verify login" });
  }
});

/**
 * @swagger
 * /api/auth/passkey:
 *   get:
 *     summary: List the authenticated user's passkeys
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of registered passkeys (public fields only).
 */
router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({
      credentials: user.credentials.map(publicCredentialView),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/auth/passkey/{credentialId}:
 *   delete:
 *     summary: Remove a registered passkey
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: credentialId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Passkey removed.
 *       404:
 *         description: Credential not found.
 */
router.delete(
  "/:credentialId",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.user?.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const before = user.credentials.length;
      user.credentials = user.credentials.filter(
        (c) => c.credentialID !== req.params.credentialId,
      ) as typeof user.credentials;
      if (user.credentials.length === before) {
        return res.status(404).json({ message: "Credential not found" });
      }
      await user.save();
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  },
);

export default router;
