import { NextResponse } from "next/server";
import type { ModalWsConfigResponse } from "../../../../Data_Types/Referee_Types";

export const dynamic = "force-dynamic";

const DEFAULT_BASE_URL = "https://kitkhachon-xx--web.us-east.modal.run";
const DEFAULT_WS_URL = "wss://kitkhachon-xx--web.us-east.modal.run/ws/webcam";

export async function GET(): Promise<NextResponse<ModalWsConfigResponse>> {
  const baseUrl = (process.env.MODAL_API_BASE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
  const rawWsUrl = (process.env.MODAL_WS_URL || DEFAULT_WS_URL).trim();
  const apiKey = (process.env.FOOTBALL_API_KEY || "").trim();

  const url = new URL(rawWsUrl);
  if (apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  return NextResponse.json(
    {
      wsUrl: url.toString(),
      baseUrl,
      hasApiKey: Boolean(apiKey),
    },
    { status: 200 }
  );
}
