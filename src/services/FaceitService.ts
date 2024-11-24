import axios from "axios";
import { FACEIT_API_KEY } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";

export async function getFaceitLevel(
  faceitNickname: string
): Promise<FaceitPlayer | null> {
  try {
    const response = await axios.get(
      `https://open.faceit.com/data/v4/players?nickname=${faceitNickname}`,
      { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
    );

    const { skill_level: level, faceit_elo: elo } =
      response.data?.games?.cs2 || {};
    return { level, elo };
  } catch (error) {
    console.error("Error fetching Faceit data:", error);
    return null;
  }
}
