# ทางเลือกโมเดลเบา/เร็ว แทน YOLO สำหรับงานท่ากรรมการ (20 คลาส, ~1 คน/ภาพ)

วันที่: 2026-11-15 · แหล่งที่มา: หน้าเอกสารทางการที่ดึงมาอ่านในรอบนี้ (ลิงก์ท้ายไฟล์) · [V] = เห็นตัวเลขในหน้านั้นจริง, [J] = ข้อสรุปของผู้เขียน, [U] = ยังไม่ได้ตรวจ

## ตัวอ้างอิง: YOLO26n-pose ที่ใช้อยู่ [V]
2.9M params, 7.6 GFLOPs, pose mAP50-95 57.2 (COCO), CPU ONNX 40.3 ms, T4 TensorRT 1.8 ms (640 px).
**ข้อสรุปสำคัญ [J]:** นี่เป็นรุ่น one-stage ที่เล็กอยู่แล้ว ทางเลือกด้านล่างแทบไม่ "เล็กกว่า" ในแง่ params/latency (ยกเว้น MoveNet/RTMPose-t ที่เร็วกว่าบน CPU/มือถือ) ข้อได้เปรียบจริงอยู่ที่ *รูปแบบการใช้งาน* ไม่ใช่ขนาด

## ตัวเลือก
| โมเดล | ขนาด/ความเร็วที่ยืนยันได้ | ข้อดีกับงานนี้ | ข้อจำกัด |
|---|---|---|---|
| **RTMPose-t / s** (MMPose, top-down, 17 kp) | t: 3.34M params, 0.36 GFLOPs, AP 68.5, CPU ORT 3.2 ms, มือถือ ncnn 9 ms; s: 5.47M, 0.68 GFLOPs, AP 72.2, 4.5 ms [V] (ที่ 256x192, ไม่นับ detector) | เร็วสุดบน CPU/มือถือ; AP สูงกว่า YOLO26n-pose ที่ตัวเลขเทียบกันตรง ๆ ไม่ได้ (คนละ benchmark) ใช้ต่อกับตัวจำแนกท่า (MLP/RF) ที่มีแล้ว | ต้องมี person detector แยก (ภาพเรามี ~1 คน จึงใช้ detector เล็กได้) pipeline สองขั้นตอนมากขึ้น |
| **MoveNet Lightning / Thunder** (17 kp) | "30+ FPS บน desktop/laptop/มือถือ"; input 192 / 256 px; Lightning เน้น latency, Thunder เน้นแม่น [V] (หน้าไม่ให้ตัวเลข ms/AP) | เบามาก, รัน TFLite ได้, งานเราเป็นคนเดียวต่อภาพเป็นส่วนใหญ่ | **เป็น single-person**; เรามี 3 ภาพที่มี 2 คน; ไม่ได้ผ่านการ fine-tune ง่ายเท่า YOLO |
| **MediaPipe Pose Landmarker** (lite/full/heavy) | 33 landmarks, input 224/256, `numPoses` ตั้งได้ (default 1), รัน Web/Android/iOS/Python [V]; หน้าไม่ให้ latency [V] | 33 จุดรวมปลายมือ/นิ้ว (หน้าเอกสารบอกจำนวน 33 จุด ส่วนว่าจุดใดคือมือเป็นความรู้ทั่วไป [U]) น่าจะช่วยท่าที่ใช้มือ เช่น Card/Hand_Ball [J] ใช้งานง่าย ไม่ต้องเทรน pose | ไม่ fine-tune ตำแหน่งจุดได้ง่าย; ต้องเทรนตัวจำแนกท่าเองบน landmarks (ทำได้ด้วย pipeline two-stage เดิม) |
| **RTMO-s** (one-stage หลายคน) | AP 0.686 (body7), V100 8.9 ms ที่ 640 px [V] (ไม่มี params/FLOPs/CPU บนหน้านั้น) | one-stage เหมือน YOLO | ไม่เบากว่า YOLO26n-pose (T4 TRT 1.8 ms) [J] ไม่แนะนำ |
| **Image classifier บน crop คน** (เช่น MobileNetV3-small/large) | หน้า torchvision ไม่ให้ params/GFLOPs/acc [U] | เรียนรู้จากพิกเซลโดยตรง จึงเห็นมือ/บริบทที่ 17 keypoints มองไม่เห็น | ข้อมูลน้อย (≈885 ภาพ/20 คลาส) overfit ง่าย; ต้องมี detector ตัดคน |

## ข้อเสนอ [J]
1. **อย่าเปลี่ยนเพราะ "ขนาด"** YOLO26n-pose เบาพออยู่แล้ว คอขวดผลลัพธ์คือข้อมูล (ประมาณ 3 burst ต่อคลาส, Offside/Goal/Elbowing F1 = 0 บน split เก่า) ไม่ใช่ความจุโมเดล
2. ถ้าต้องการทางเลือกที่ต่างจริง ลอง **MediaPipe Pose 33 landmarks → ตัวจำแนกเดิม (RF/MLP)** ก่อน เพราะใช้โค้ด `Train/features.py` และ `trainTwoStage.py` ซ้ำได้เกือบทั้งหมด ต้องแก้ตัวดึงฟีเจอร์ให้รองรับ 33 จุด
3. ถ้าต้องการ latency ต่ำบนมือถือ/CPU ให้ดู **RTMPose-s + detector เล็ก** แต่ต้องวัด latency จริงรวม detector บนเครื่องปลายทาง
4. เทียบโมเดลบน test split เดียวกัน (macro-F1 รายคน ตามที่ `Evaluate/` ใช้) ไม่ใช่เทียบ mAP/AP ข้าม benchmark

## แหล่งที่มา
- https://docs.ultralytics.com/tasks/pose/
- https://github.com/open-mmlab/mmpose/tree/main/projects/rtmpose
- https://github.com/open-mmlab/mmpose/tree/main/projects/rtmo
- https://www.tensorflow.org/hub/tutorials/movenet
- https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- https://docs.pytorch.org/vision/stable/models/mobilenetv3.html (ไม่มีตัวเลข)
