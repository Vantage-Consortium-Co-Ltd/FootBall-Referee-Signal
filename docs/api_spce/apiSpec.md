# API Spec — Football Referee Signal Service

FastAPI service ที่ห่อโมเดล YOLO26n-pose (ส่งออกเฉพาะชื่อท่า + confidence ต่อคน, 20 ท่า) · เวอร์ชัน API `0.1.0`
โค้ด: `Inference/app/service.py` (endpoint), `Inference/app/predict.py` (โมเดล) · เอกสารอัตโนมัติ: `GET /docs`, `GET /openapi.json`

## 1. รันและตั้งค่า

```bash
python Inference/main.py          # -> http://127.0.0.1:8000
python Inference/testService.py  # self-check กับโมเดลจริง
```

ค่าทั้งหมดอยู่ในหมวด `inference:` ของ `config.yaml` (ไม่ฝังในโค้ด)

| key | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `host` / `port` | `127.0.0.1` / `8000` | ที่อยู่ที่เซิร์ฟเวอร์ฟัง (ใส่ `0.0.0.0` เพื่อให้เครื่องอื่นเรียกได้) |
| `model_path` | `Train/model_output_version/results_c2/runs/one_stage/best_overall.pt` | น้ำหนักโมเดล (path สัมพัทธ์เริ่มที่ root ของ repo) |
| `device` | `"0"` | เลข GPU (`"0"` = การ์ดแรก, ต้องมี CUDA) หรือ `cpu` — ถ้าตั้ง GPU แต่ไม่มี CUDA เซิร์ฟเวอร์จะไม่เริ่มและแจ้งสาเหตุ |
| `fp16` | `true` | คำนวณแบบ FP16 บน GPU (เร็วขึ้น ใช้หน่วยความจำน้อยลง ผลต่างจาก FP32 เล็กน้อย) |
| `imgsz` | `640` | ขนาดภาพที่ป้อนโมเดล |
| `conf` | `0.25` | confidence ต่ำสุดที่นับเป็น detection |
| `max_upload_mb` | `100` | ขนาดไฟล์อัปโหลดสูงสุด |
| `video.stride` | `5` | รันโมเดลทุก N เฟรม |
| `video.max_seconds` | `30` | อ่านวิดีโอไม่เกินกี่วินาที (ส่วนที่เกินถูกตัด) |

ไม่มี authentication และไม่จำกัดอัตราคำขอ — ใช้ภายในเครื่อง/เครือข่ายที่เชื่อถือได้เท่านั้น

## 1.1 Authentication

ถ้ามีตัวแปรสภาพแวดล้อมที่ชื่อตาม `inference.api_key_env` (ค่าเริ่มต้น `FOOTBALL_API_KEY`) service จะบังคับใช้คีย์: ส่ง header `X-API-Key: <key>`
(WebSocket ส่ง header เดียวกัน หรือ query `?api_key=<key>`) ผิด/ไม่ส่ง → HTTP `401` (WebSocket ปิดด้วยโค้ด `1008`) · `/health` เปิดโดยไม่ต้องมีคีย์
ไม่ตั้งตัวแปร = ไม่มี auth (ใช้ในเครื่อง) · WebSocket ที่ไม่มีเฟรมส่งมานานกว่า `ws_idle_seconds` (30 วินาที) จะถูกปิด (โค้ด `1001`)

## 2. Endpoints

| Method | Path             | ใช้ทำอะไร                    |
| ------ | ---------------- | ---------------------------- |
| GET    | `/health`        | ตรวจสถานะและค่าที่ใช้อยู่    |
| POST   | `/predict/image` | ตรวจจับในภาพ 1 ภาพ           |
| POST   | `/predict/video` | ตรวจจับในวิดีโอ (ทุก N เฟรม) |
| WS     | `/ws/webcam`     | ตรวจจับแบบสด ทีละเฟรม        |

### 2.1 `GET /health`

Response `200`
```json
{"status": "ok", "model": "Train/model_output_version/results_c2/runs/one_stage/best_overall.pt",
 "device": "cpu", "conf": 0.25, "imgsz": 640}
```

### 2.2 `POST /predict/image`

Request: `multipart/form-data`, ฟิลด์ `file` = ไฟล์ภาพ (jpg/png/… ที่ OpenCV อ่านได้) · query `annotated` (bool, ค่าเริ่มต้น `false`)

| annotated | Response `200` |
|---|---|
| `false` | `application/json` → `{"detections": [Detection, ...]}` (ว่างถ้าไม่พบ) |
| `true` | `image/jpeg` ภาพที่วาดกล่อง + โครงกระดูก + ชื่อท่า |

ตัวอย่าง
```bash
curl -F "file=@photo.jpg" http://127.0.0.1:8000/predict/image
curl -F "file=@photo.jpg" "http://127.0.0.1:8000/predict/image?annotated=true" -o result.jpg
```

### 2.3 `POST /predict/video`

Request: `multipart/form-data`, ฟิลด์ `file` = วิดีโอ (mp4/avi/mov/… ที่ OpenCV อ่านได้)

Response `200` (`application/json`)
```json
{"fps": 10.0, "frames_read": 12,
 "results": [{"frame": 0, "time": 0.0, "detections": [Detection, ...]},
             {"frame": 5, "time": 0.5, "detections": []}]}
```
- `frames_read` = จำนวนเฟรมที่อ่าน (สูงสุด `fps × video.max_seconds`)
- `results` มีเฉพาะเฟรมที่ `frame % video.stride == 0` · `time` = วินาที · ผลเป็น JSON ไม่ใช่วิดีโอที่วาดแล้ว

### 2.4 `WS /ws/webcam`

เชื่อมต่อ `ws://<host>:<port>/ws/webcam` แล้ววนซ้ำ: **ส่ง** 1 เฟรม JPEG เป็น binary message → **รับ** 1 JSON message
```json
{"detections": [Detection, ...]}
```
- เฟรมที่ถอดรหัสไม่ได้ → ได้ `{"detections": []}` (ไม่ตัดการเชื่อมต่อ)
- ฝั่ง client ควรรอผลก่อนส่งเฟรมถัดไป เพื่อไม่ให้คิวสะสม (โมเดลบน CPU ใช้เวลาต่อเฟรมประมาณ 0.1–1 วินาที)
- ปิดการเชื่อมต่อได้ทุกเมื่อ เซิร์ฟเวอร์จบ session อย่างปกติ

```python
import asyncio, cv2, json, websockets

async def main():
    cap = cv2.VideoCapture(0)
    async with websockets.connect("ws://127.0.0.1:8000/ws/webcam") as ws:
        while cap.isOpened():
            ok, frame = cap.read()
            await ws.send(cv2.imencode(".jpg", frame)[1].tobytes())
            print(json.loads(await ws.recv())["detections"])
asyncio.run(main())
```

## 3. Schema

### Detection
| field | type | ความหมาย |
|---|---|---|
| `label` | string | ชื่อท่า 1 ใน 20 คลาส (ดูข้อ 4) |
| `confidence` | number (0–1) | ความมั่นใจ ปัด 4 ตำแหน่ง |

ตัวอย่าง: `{"label": "Corner_Kick", "confidence": 0.8313}` · ภาพที่มีหลายคนจะได้หลาย Detection (1 รายการต่อคน) · JSON ไม่ส่งกล่อง/keypoints (ภาพ `?annotated=true` ยังวาดกล่องและโครงกระดูกให้ดู)

## 4. คลาส (label)

`Referee, Indirect_Free_Kick, Direct_Free_Kick, Card, Play_On, Penalty_Kick, Offside, Offside_Location, Substitution, Goal, Disallowed_Goal, Time_out, Corner_Kick, Jumping, Obstruction, Pushing, Hand_Ball, Elbowing, Tripping, Kicking`

คุณภาพ (test split เดิม 154 คน): macro-F1 0.72, accuracy 0.73 — **Offside, Goal, Elbowing ยังจำแนกไม่ได้ (F1 = 0)** อย่านำไปใช้ตัดสินจริง

## 5. Errors

รูปแบบมาตรฐานของ FastAPI: `{"detail": "..."}`

| HTTP | เมื่อไร | ตัวอย่าง `detail` |
|---|---|---|
| 400 | ไฟล์ไม่ใช่ภาพ / อ่านวิดีโอไม่ได้ | `"not a readable image"`, `"not a readable video"` |
| 413 | ไฟล์ใหญ่กว่า `max_upload_mb` | `"file larger than 100 MB"` |
| 422 | ไม่ส่งฟิลด์ `file` หรือ query ผิดชนิด | `[{"type": "missing", "loc": ["body", "file"], ...}]` |
| 500 | ข้อผิดพลาดภายใน (เช่น โหลดโมเดลไม่ได้ตอนเริ่ม จะไม่ขึ้นเซิร์ฟเวอร์เลย) | — |

## 6. ข้อจำกัดที่ทราบ

- ไม่มี auth / rate limit / CORS (หากเรียกจากเว็บคนละ origin ต้องเพิ่ม `CORSMiddleware`)
- การประมวลผลทำทีละคำขอใน thread pool; ไฟล์อัปโหลดถูกอ่านเข้าหน่วยความจำทั้งไฟล์ก่อนตรวจขนาด (`max_upload_mb` ป้องกันการใช้เกินระดับหนึ่ง แต่ไม่ใช่ streaming)
- `/predict/video` ไม่คืนวิดีโอที่วาดผลแล้ว และเป็น synchronous: วิดีโอยาวทำให้คำขอค้างนาน
- ไม่มี versioning ใน path (`/v1/...`); เปลี่ยนรูปแบบ response ต้องปรับเลขเวอร์ชันใน `create_app`
