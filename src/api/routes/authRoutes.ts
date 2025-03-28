import express from "express";
import axios from "axios";
import { config } from "../../config";

const authRoutes = express.Router();

const FACEIT_AUTH_URL = "https://accounts.faceit.com/oauth/authorize";
const FACEIT_TOKEN_URL = "https://accounts.faceit.com/oauth/token";
const FACEIT_USER_INFO_URL = "https://open.faceit.com/data/v4/players";

// Redirect user to Faceit login
authRoutes.get("/", (req, res) => {
  const authUrl = `${FACEIT_AUTH_URL}?client_id=${config.FACEIT_CLIENT_ID}&redirect_uri=${process.env.FACEIT_REDIRECT_URI}&response_type=code&scope=openid`;
  res.redirect(authUrl);
});

authRoutes.get("/authorization", async (req, res) => {
  const code = req.query.code as string;
  if (!code) res.status(400).json({ error: "No authorization code received" });

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      FACEIT_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.FACEIT_CLIENT_ID!,
        client_secret: process.env.FACEIT_CLIENT_SECRET!,
        redirect_uri: process.env.FACEIT_REDIRECT_URI!,
        code: code,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user details from Faceit API
    const userResponse = await axios.get(FACEIT_USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const faceitName = userResponse.data.nickname;
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
