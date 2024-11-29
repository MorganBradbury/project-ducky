import { AxiosInstance } from "axios";

/**
 * Helper function to fetch data from Faceit API with dynamic URLs and params
 * @param client - The axios client instance.
 * @param url - The URL to fetch data from.
 * @param params - The query parameters to include in the request.
 * @returns The fetched data or null if there was an error.
 */
export async function fetchData(
  client: AxiosInstance,
  url: string,
  params: any = {}
): Promise<any> {
  try {
    const response = await client.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return null;
  }
}
