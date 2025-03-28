import express from "express";
import axios from "axios";
import crypto from "crypto";
import { config } from "../../config";

const authRoutes = express.Router();

const FACEIT_AUTH_URL = "https://accounts.faceit.com/oauth/authorize";
const FACEIT_TOKEN_URL = "https://accounts.faceit.com/oauth/token";
const FACEIT_USER_INFO_URL = "https://open.faceit.com/data/v4/players";

// Temporary storage (Use Redis or a DB for production)
const sessionStore = new Map<
  string,
  { discordId: string; codeVerifier: string }
>();

// Function to handle user linking
const handleUserLink = (discordId: string, faceitName: string) => {
  console.log(`Linking Discord ID: ${discordId} with Faceit: ${faceitName}`);
  // Call your function here (e.g., store in DB, send a message, etc.)
};

// Function to generate a random string (code_verifier)
const generateCodeVerifier = (): string =>
  crypto.randomBytes(32).toString("base64url");

// Function to generate a SHA256 hash of code_verifier (code_challenge)
const generateCodeChallenge = (codeVerifier: string): string =>
  crypto.createHash("sha256").update(codeVerifier).digest("base64url");

// 🔹 Step 1: Redirect user to Faceit login, storing Discord ID
authRoutes.get("/", (req, res) => {
  const discordId = req.query.discordId as string;
  if (!discordId) {
    res.status(400).json({ error: "Missing Discord ID" });
    return;
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const sessionId = crypto.randomBytes(16).toString("hex");

  // Store the session data
  sessionStore.set(sessionId, { discordId, codeVerifier });

  const authUrl = `${FACEIT_AUTH_URL}?client_id=${config.FACEIT_CLIENT_ID}&redirect_uri=${process.env.FACEIT_REDIRECT_URI}&response_type=code&scope=openid&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${sessionId}`;

  res.redirect(authUrl);
});

// 🔹 Step 2: Handle Faceit OAuth callback, retrieve Discord ID & Faceit nickname
authRoutes.get("/authorization", async (req, res) => {
  const code = req.query.code as string;
  const sessionId = req.query.state as string;

  if (!code || !sessionId) {
    res
      .status(400)
      .json({ error: "Missing authorization code or session state" });
    return;
  }

  // Retrieve session data
  const sessionData = sessionStore.get(sessionId);
  if (!sessionData) {
    res.status(400).json({ error: "Invalid session or expired session" });
    return;
  }

  const { discordId, codeVerifier } = sessionData;

  try {
    // Exchange authorization code for access token using PKCE
    const tokenResponse = await axios.post(
      FACEIT_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.FACEIT_CLIENT_ID!,
        client_secret: process.env.FACEIT_CLIENT_SECRET!,
        redirect_uri: process.env.FACEIT_REDIRECT_URI!,
        code: code,
        code_verifier: codeVerifier,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user details from Faceit API
    const userResponse = await axios.get(FACEIT_USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const faceitName = userResponse.data.nickname;

    // Call your function to link the user
    handleUserLink(discordId, faceitName);

    // Cleanup session storage
    sessionStore.delete(sessionId);

    res.json({ discordId, faceitName });
  } catch (error: any) {
    console.error(
      "Error fetching Faceit user:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch Faceit user data" });
  }
});

export default authRoutes;
