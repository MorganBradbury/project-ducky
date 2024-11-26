import axios, { AxiosInstance } from "axios";
import { FACEIT_API_KEY } from "../config";
import { FaceitPlayer } from "../types/FaceitPlayer";
import { validateAndExtract } from "../utils/faceitUtil";

class FaceitApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://open.faceit.com/data/v4",
      headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
    });
  }

  async getPlayerData(faceitNickname: string): Promise<FaceitPlayer | null> {
    try {
      const response = await this.client.get(
        `/players?nickname=${faceitNickname}`
      );
      const cs2Data = validateAndExtract<FaceitPlayer>(
        response.data?.games?.cs2,
        ["skill_level", "faceit_elo"]
      );

      if (!cs2Data) {
        console.warn(`Invalid or incomplete data for ${faceitNickname}`);
        return null;
      }

      return cs2Data;
    } catch (error) {
      console.error(`Error fetching Faceit data for ${faceitNickname}:`, error);
      return null;
    }
  }
}

export const faceitApiClient = new FaceitApiClient();
