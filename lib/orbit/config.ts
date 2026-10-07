import { appUrl } from "@/lib/app-url";
export const ORBIT_BASE_URL = "https://api.orbit.teamleader.eu";
export const ORBIT_MCP_URL = `${ORBIT_BASE_URL}/mcp`;
export const ORBIT_REDIRECT_URI = appUrl("/api/orbit/callback");
/** De Orbit-projectmap "Norday | Culture". */
export const CULTURE_FOLDER_ID = "PFSKPK1A598RYGX";

export function orbitClientId(): string {
  const clientId = process.env.ORBIT_CLIENT_ID;
  if (!clientId) {
    throw new Error("ORBIT_CLIENT_ID ontbreekt in .env.local");
  }
  return clientId;
}
