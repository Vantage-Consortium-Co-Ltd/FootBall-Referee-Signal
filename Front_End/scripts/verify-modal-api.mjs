import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

function loadEnvLocal(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing .env.local at ${filePath}`);
  }
  const env = {};
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    env[k] = v;
  }
  return env;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createTestPngBuffer(width = 64, height = 64) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const idx = y * stride + 1 + x * 3;
      raw[idx] = 20;
      raw[idx + 1] = 120;
      raw[idx + 2] = 220;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", idat),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function run() {
  const env = loadEnvLocal(envPath);
  const baseUrl = (
    env.MODAL_API_BASE_URL || "https://kitkhachon-xx--web.us-east.modal.run"
  ).replace(/\/+$/, "");
  const wsBaseUrl =
    env.MODAL_WS_URL || "wss://kitkhachon-xx--web.us-east.modal.run/ws/webcam";
  const apiKey = env.FOOTBALL_API_KEY;
  assert.ok(apiKey, "FOOTBALL_API_KEY must be set in Front_End/.env.local");

  const pngBytes = createTestPngBuffer(64, 64);

  // 1. GET /health
  console.log("1. Checking GET /health...");
  const healthRes = await fetch(`${baseUrl}/health`, {
    signal: AbortSignal.timeout(65000),
  });
  assert.equal(healthRes.status, 200, `Expected /health 200, got ${healthRes.status}`);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.status, "ok", "Expected health status === 'ok'");
  assert.equal(healthJson.device, "cpu", "Expected health device === 'cpu'");
  console.log("   PASS /health:", healthJson);

  // 2. POST /predict/image (JSON)
  console.log("2. Checking POST /predict/image (JSON)...");
  const formJson = new FormData();
  formJson.append("file", new Blob([pngBytes], { type: "image/png" }), "test.png");
  const imgRes = await fetch(`${baseUrl}/predict/image`, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: formJson,
    signal: AbortSignal.timeout(90000),
  });
  assert.equal(imgRes.status, 200, `Expected /predict/image 200, got ${imgRes.status}`);
  const imgJson = await imgRes.json();
  assert.ok(Array.isArray(imgJson.detections), "Expected body.detections to be an array");
  console.log("   PASS /predict/image (JSON):", imgJson);

  // 3. POST /predict/image?annotated=true (JPEG)
  console.log("3. Checking POST /predict/image?annotated=true...");
  const formPlot = new FormData();
  formPlot.append("file", new Blob([pngBytes], { type: "image/png" }), "test.png");
  const plotRes = await fetch(`${baseUrl}/predict/image?annotated=true`, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
    body: formPlot,
    signal: AbortSignal.timeout(90000),
  });
  assert.equal(
    plotRes.status,
    200,
    `Expected /predict/image?annotated=true 200, got ${plotRes.status}`
  );
  const contentType = plotRes.headers.get("content-type") || "";
  assert.ok(
    contentType.includes("image/jpeg"),
    `Expected image/jpeg content-type, got ${contentType}`
  );
  const jpegBuf = Buffer.from(await plotRes.arrayBuffer());
  assert.ok(jpegBuf.length > 100, "Expected non-empty JPEG payload");
  console.log(`   PASS /predict/image?annotated=true: ${jpegBuf.length} bytes (${contentType})`);

  // 4. WS /ws/webcam?api_key=...
  console.log("4. Checking WS /ws/webcam...");
  const wsUrl = new URL(wsBaseUrl);
  wsUrl.searchParams.set("api_key", apiKey);

  const wsReply = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WebSocket /ws/webcam timed out after 30s"));
    }, 30000);

    const ws = new WebSocket(wsUrl.toString());
    ws.binaryType = "arraybuffer";

    ws.addEventListener("open", () => {
      ws.send(pngBytes);
    });

    ws.addEventListener("message", (event) => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(String(event.data));
        ws.close(1000, "verified");
        resolve(parsed);
      } catch (err) {
        ws.close(1000);
        reject(err);
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection error"));
    });

    ws.addEventListener("close", (ev) => {
      if (ev.code === 1008) {
        clearTimeout(timeout);
        reject(new Error("WebSocket rejected API key (1008)"));
      }
    });
  });

  assert.ok(
    Array.isArray(wsReply.detections),
    "Expected WS response to contain detections array"
  );
  console.log("   PASS WS /ws/webcam:", wsReply);

  console.log("\nALL MODAL ENDPOINT CHECKS PASSED.");
}

run().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
