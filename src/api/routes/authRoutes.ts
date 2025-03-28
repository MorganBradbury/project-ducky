import express from "express";
import axios from "axios";
import crypto from "crypto";
import { config } from "../../config";

const authRoutes = express.Router();

const FACEIT_AUTH_URL = "https://accounts.faceit.com/oauth/authorize";
const FACEIT_TOKEN_URL = "https://accounts.faceit.com/oauth/token";
const FACEIT_USER_INFO_URL = "https://open.faceit.com/data/v4/players";

// Temporary store for PKCE values (Use Redis or DB for production)
const pkceStore = new Map<string, string>();

// Generate a secure random string (code_verifier)
const generateCodeVerifier = (): string => {
  return crypto.randomBytes(32).toString("base64url");
};

// Generate a SHA256 hash of the code_verifier (code_challenge)
const generateCodeChallenge = (codeVerifier: string): string => {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
};

// Redirect user to Faceit login with PKCE
authRoutes.get("/", (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Generate session ID and store code_verifier (Temporary storage)
  const sessionId = crypto.randomBytes(16).toString("hex");
  pkceStore.set(sessionId, codeVerifier);

  const authUrl = `${FACEIT_AUTH_URL}?client_id=${config.FACEIT_CLIENT_ID}&redirect_uri=${process.env.FACEIT_REDIRECT_URI}&response_type=code&scope=openid&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${sessionId}`;

  res.redirect(authUrl);
});

// Handle Faceit OAuth callback
authRoutes.get("/authorization", async (req, res) => {
  const code = req.query.code as string;
  const sessionId = req.query.state as string; // Retrieve session ID

  if (!code || !sessionId) {
    res
      .status(400)
      .json({ error: "Missing authorization code or session state" });
    return;
  }

  const codeVerifier = pkceStore.get(sessionId);
  if (!codeVerifier) {
    res.status(400).json({ error: "Invalid session or expired code_verifier" });
    return;
  }

  try {
    // Exchange authorization code for access token with PKCE
    const tokenResponse = await axios.post(
      FACEIT_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.FACEIT_CLIENT_ID!,
        client_secret: process.env.FACEIT_CLIENT_SECRET!,
        redirect_uri: process.env.FACEIT_REDIRECT_URI!,
        code: code,
        code_verifier: codeVerifier, // Send stored code_verifier
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user details from Faceit API
    const userResponse = await axios.get(FACEIT_USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const faceitName = userResponse.data.nickname;

    // Cleanup session storage
    pkceStore.delete(sessionId);

    res.json({ faceitName });
  } catch (error: any) {
    console.error(
      "Error fetching Faceit user:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch Faceit user data" });
  }
});

export default authRoutes;
