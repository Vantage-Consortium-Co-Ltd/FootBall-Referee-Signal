import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_BASE_URL = "https://kitkhachon-xx--web.us-east.modal.run";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const baseUrl = (process.env.MODAL_API_BASE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
  const apiKey = (process.env.FOOTBALL_API_KEY || "").trim();
  const annotated = request.nextUrl.searchParams.get("annotated") === "true";

  try {
    const incoming = await request.formData();
    const file = incoming.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { detail: "Missing 'file' field in multipart/form-data" },
        { status: 422 }
      );
    }

    const upstreamForm = new FormData();
    const filename = file instanceof File && file.name ? file.name : "frame.jpg";
    upstreamForm.append("file", file, filename);

    const targetUrl = `${baseUrl}/predict/image${annotated ? "?annotated=true" : ""}`;
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: upstreamForm,
      cache: "no-store",
      signal: AbortSignal.timeout(90000),
    });

    if (!upstream.ok) {
      const contentType = upstream.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const errJson = await upstream.json();
        return NextResponse.json(errJson, { status: upstream.status });
      }
      const errText = await upstream.text();
      return NextResponse.json(
        { detail: errText || `Upstream returned HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    if (annotated) {
      const buf = await upstream.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    const json = await upstream.json();
    return NextResponse.json(json, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image inference proxy failed";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
