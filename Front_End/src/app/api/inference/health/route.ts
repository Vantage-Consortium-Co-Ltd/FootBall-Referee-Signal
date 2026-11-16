import { NextResponse } from "next/server";
import type { ModalHealthResponse } from "../../../../Data_Types/Referee_Types";

export const dynamic = "force-dynamic";

const DEFAULT_BASE_URL = "https://kitkhachon-xx--web.us-east.modal.run";

export async function GET(): Promise<NextResponse<ModalHealthResponse>> {
  const baseUrl = (process.env.MODAL_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const start = Date.now();

  try {
    const upstream = await fetch(`${baseUrl}/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(65000),
    });

    const latencyMs = Date.now() - start;

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        {
          status: "error",
          model: "unavailable",
          device: "cpu",
          conf: 0.25,
          imgsz: 640,
          latencyMs,
          detail: errText || `Upstream returned HTTP ${upstream.status}`,
        },
        { status: 503 }
      );
    }

    const data = (await upstream.json()) as ModalHealthResponse;
    return NextResponse.json(
      {
        ...data,
        status: data.status === "ok" ? "ok" : "error",
        latencyMs,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reach Modal health endpoint";
    return NextResponse.json(
      {
        status: "error",
        model: "unavailable",
        device: "cpu",
        conf: 0.25,
        imgsz: 640,
        latencyMs: Date.now() - start,
        detail: message,
      },
      { status: 503 }
    );
  }
}
