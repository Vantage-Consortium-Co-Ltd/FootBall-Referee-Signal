# การจูน hyperparameter ของ One-stage training (YOLO26n-pose) + Early stopping

วันที่ตรวจ: 2026-11-14 · เวอร์ชันที่อ่าน source: Ultralytics **8.4.212** (`C:\Users\jack2\anaconda3\Lib\site-packages\ultralytics`)
แหล่งอ้างอิง: เอกสารทางการ docs.ultralytics.com + source ที่ติดตั้งจริง + ไฟล์ในรีโปนี้เท่านั้น (ไม่ใช้บล็อก)
สัญลักษณ์: **[V]** = ตรวจจาก source/ไฟล์จริง, **[D]** = เอกสารทางการ, **[J]** = ข้อสรุป/ข้อเสนอของผู้เขียน (ไม่ใช่ข้อเท็จจริงจากเอกสาร), **[U]** = ยังพิสูจน์ไม่ได้ (unverified)

---

## 1. สรุปและข้อเสนอ (อ่านส่วนนี้ส่วนเดียวก็พอ)

**ข้อค้นพบหลัก 3 ข้อ**

1. **`lr0` ที่เราใส่ใน grid ไม่มีผลเลย** เพราะ `optimizer: auto` (ค่า default) ทำให้ trainer *ทิ้ง* `lr0` แล้วเลือกเองเป็น **AdamW, lr=0.000417, momentum=0.9** (ดู §3). `results.csv` ของ trial0 (lr0=0.01) กับ trial1 (lr0=0.001) **ตรงกันทุกค่าทุก epoch** (diff สูงสุด = 0.0 ทุกคอลัมน์ ยกเว้นคอลัมน์ `time` ที่ไม่ได้เทียบ) และ `args.yaml` ต่างกันแค่ `name`, `lr0`, `save_dir`. กริด 2 trial ที่ผ่านมาจึงเป็นการรันซ้ำ run เดียวกันสองครั้ง
2. **Early stopping ไม่เคยทำงาน** เพราะไม่ได้ส่ง `patience` → ใช้ default `patience=100` = `epochs=100`; stopper จะหยุดได้ก็ต่อเมื่อ epoch ที่ไม่ดีขึ้นนับได้ ≥100 ซึ่งเป็นไปไม่ได้ในรอบ 100 epoch (best อยู่ที่ epoch 37) แต่ **`best.pt` ยังเก็บ epoch ที่ดีที่สุดไว้ให้อยู่แล้ว** (epoch 37) จึง "เลือก checkpoint" ได้ถูก แค่เสียเวลาเทรนต่ออีก 63 epoch (~19 นาที) และ overfit ต่อ
3. **Val fitness สั่นมาก** (±0.05–0.10 ระหว่าง epoch ติดกัน เพราะ val มีแค่ 182 ภาพ/ราว 5–14 instance ต่อคลาส) → `patience` เล็ก (10–20) จะหยุดเร็วเกินและได้ checkpoint แย่กว่า (จำลองจาก results.csv: patience 20 หยุดที่ epoch 36 ได้ best=epoch 16, fitness 1.711 แทน 1.735). แนะนำ **`patience=30`**

**สิ่งที่ควรแก้ (ข้อเสนอ ยังไม่ได้แก้ไฟล์ใด ๆ)**

| ไฟล์ | เปลี่ยน |
|---|---|
| `Train/config.yaml` `one_stage:` | เพิ่ม `optimizer: [AdamW]` (บังคับให้ `lr0` มีผล), `patience: [30]`, `cos_lr: [true]`, `freeze: [null, 10]` และ `lr0: [0.0004, 0.001]`; ลด `epochs` เป็น `[80]` (บล็อกเต็มใน §6) |
| `Train/trainOneStage.py` | **ไม่ต้องแก้เพื่อให้ใช้ได้**: ทุก key ใน config ถูกส่งตรงเข้า `model.train(**p)` ผ่าน `ParameterGrid` อยู่แล้ว. ที่แนะนำเพิ่ม (ไม่บังคับ): log `best_epoch`/`epochs_run` ลง MLflow (อ่านจาก `results.csv`) และเปลี่ยน `--project` ทุกครั้งที่รัน round ใหม่ เพราะ `exist_ok=True` + ชื่อ `trial{k}` จะเขียนทับผลเดิม |
| วิธีจูน | ใช้ **ParameterGrid ที่มีอยู่ แบบเป็นรอบ ๆ (ครั้งละ ≤4 run)** มากกว่า `model.tune()` สำหรับงบ 2–3 ชม. (เหตุผล §5) |

---

## 2. Early stopping ใน Ultralytics 8.4.212 ทำงานอย่างไร

- **นิยาม `patience`**: "จำนวน epoch ที่รอโดย validation metric ไม่ดีขึ้น ก่อนหยุด" default `100` — [D] https://docs.ultralytics.com/modes/train/ ; [V] `cfg/default.yaml` บรรทัด `patience: 100`.
- **ตัวนับ** [V] `utils/torch_utils.py` `class EarlyStopping` (L1120–1169): `best_fitness` เริ่ม 0.0; ถ้า `fitness > best_fitness` (เทียบแบบ **มากกว่าเคร่งครัด** เสมอไม่นับ) จะอัปเดต `best_epoch`; `delta = epoch - best_epoch`; **หยุดเมื่อ `delta >= patience`**. ตัวอย่าง: best ที่ epoch 37, patience=30 → หยุดที่ epoch 67 (ยืนยันด้วยการจำลองบน results.csv). `patience=0` หรือ `None` = ปิด early stopping (`float("inf")`).
- **สร้าง stopper**: `engine/trainer.py` L467 `EarlyStopping(patience=self.args.patience)`; **เรียกใช้หลัง validate ทุก epoch** L665–678 (`self.stop |= self.stopper(epoch + 1, self.fitness) or final_epoch`). `possible_stop` บังคับให้ validate แม้ `val=False` (L665).
- **`fitness` สำหรับ pose** [V]: `utils/metrics.py` `PoseMetrics.fitness` L1547–1549 = `pose.fitness() + DetMetrics.fitness`; แต่ละอันคือ `Metric.fitness` L1015–1018 ที่ใช้น้ำหนัก `[P,R,mAP50,mAP50-95] = [0,0,0,1]`. สรุป **fitness = mAP50-95(P) + mAP50-95(B)** (ช่วง 0–2, ไม่ใช่สูตร 0.1·mAP50+0.9·mAP50-95 แบบเวอร์ชันเก่า). ตรวจกับ results.csv: epoch 37 → 0.87266 + 0.86190 = **1.73456**.
  - ข้อควรระวัง [J]: box mAP ของเราสูงเกินจริง (GT box มาจาก YOLO pre-label) และ mAP นี้ไม่ใช่ macro-F1 ที่ใช้รายงานผล test, จึงเป็นเพียง proxy.
- **เซฟ checkpoint** [V] `trainer.py` L851–854: เขียน `last.pt` ทุก epoch; เขียน `best.pt` เมื่อ `best_fitness == fitness`; `save_period>0` เซฟ `epoch{N}.pt` เพิ่ม (default `-1` = ปิด). เมื่อจบ `final_eval()` (L1053) ตรวจ `best.pt` ซ้ำบน val → ค่านี้คือ `res.results_dict["fitness"]` ที่ `trainOneStage.py` ใช้เลือก trial (จึงเป็น fitness ของ epoch ที่ดีที่สุด ไม่ใช่ epoch สุดท้าย) [V] `engine/model.py` L911 (`self.metrics = trainer.validator.metrics`).
- **ผลข้างเคียงที่ต้องรู้**
  - `close_mosaic=N` ปิด mosaic เมื่อ `epoch >= epochs - N` [V] `trainer.py` L512. ถ้า early stop ก่อนถึงช่วงนั้น **mosaic จะไม่เคยถูกปิด** เลย.
  - LR schedule ผูกกับ `epochs` (ไม่ใช่กับ patience): linear `lf = (1 - x/epochs)(1-lrf)+lrf` หรือ cosine ถ้า `cos_lr=True` [V] `trainer.py` L270–276. หยุดเร็ว = LR ยังสูง; ถ้าอยากให้ LR ตกถึงปลายทางทัน ให้ลด `epochs` ไม่ใช่พึ่ง patience.
  - `time=<ชม.>` ทับ `epochs` และจะปรับ `epochs` ตามความเร็วจริง [D] modes/train; [V] trainer.py L690–697 (มีประโยชน์ถ้าต้องคุมงบ Colab ตามเวลา).

## 3. ทำไมรอบที่ผ่านมาไม่หยุดก่อน และ `optimizer=auto` กลืน `lr0`

**หลักฐานจาก `Train/results/runs/one_stage/trial0/args.yaml`**: `optimizer: auto`, `patience: 100`, `epochs: 100`, `lr0: 0.01` (trial1: `lr0: 0.001`), `batch: 16`, `nbs: 64`, `close_mosaic: 10`, `freeze: null`, `cos_lr: false`, `fliplr: 0.0`, `seed: 42`.

**Source** [V] `engine/trainer.py` `build_optimizer` L1203+:
```
if name == "auto":
    LOGGER.info("... ignoring 'lr0=...' and determining best 'optimizer' and 'lr0' automatically...")
    lr_fit = round(0.002 * 5 / (4 + nc), 6)
    name, lr, momentum = ("MuSGD", 0.01, 0.9) if iterations > 10000 else ("AdamW", lr_fit, 0.9)
    self.args.optimizer, self.args.lr0 = name, lr
    self.args.warmup_bias_lr = 0.0
```
- `iterations = ceil(len(train_dataset)/max(batch, nbs)) * epochs` (L330) = ceil(885/64)·100 = 14·100 = **1,400 < 10,000** → **AdamW**, `lr = 0.002·5/(4+20) = 0.000417`, momentum(beta1)=0.9. (ถ้ารวมภาพ _flip ในจำนวน 885 แล้ว; ตัวเลข `len(dataset)` ตรงกับ train images)
- ยืนยันกับผลจริง: `results.csv` คอลัมน์ `lr/pg0` ที่ epoch 5 = **0.000400** (≈ 0.000417 × lf) → ไม่ใช่ 0.01 หรือ 0.001.
- เอกสารยืนยัน [D] https://docs.ultralytics.com/modes/train/ : `lr0` "Ignored under the default `optimizer='auto'`; name an optimizer explicitly to use it."
- **วิธีให้ `lr0` มีผล**: ส่ง `optimizer="AdamW"` (หรือ `"SGD"`, `"MuSGD"` ...) ชัดเจน. ชื่อที่รองรับ [V] L1220: `Adam, Adamax, AdamW, NAdam, RAdam, RMSprop, SGD, MuSGD, auto`. ค่าอ้างอิงที่คอมเมนต์ใน `default.yaml`: SGD ≈ 1e-2, Adam/AdamW ≈ 1e-3. `momentum` ของ AdamW = beta1; `weight_decay` ถูกใช้ต่อ param group (ไม่ใช้กับ bias/BN) [V] L1250–1262.
- **ทำไม patience ไม่ทำงาน**: ดู §2 — patience=100 ต้องการ 100 epoch ที่ไม่ดีขึ้น แต่ run มีแค่ 100 epoch และ best อยู่ที่ 37.

**เส้นโค้งที่ re-derive จาก results.csv** (ทั้งสอง trial เหมือนกัน):

| รายการ | ค่า |
|---|---|
| mAP50-95(P) สูงสุด | epoch **37** = 0.8727 (fitness 1.7346) |
| mAP50-95(P) epoch 50 / 75 / 100 | 0.8243 / 0.8091 / **0.7729** (ไม่ใช่ 0.80x ตามที่จำไว้; epoch 100 = 0.773) |
| fitness epoch 100 | 1.5405 (ต่ำกว่าจุดสูงสุด 0.194) |
| val `cls_loss` | ต่ำสุดที่ epoch **54** = 1.228; epoch 100 = **1.486**; train `cls_loss` ตก 0.737 (ep54) → 0.294 (ep100) = overfit ชัด |
| val `pose_loss` ต่ำสุด | epoch 89 (0.0785) / val `box_loss` ต่ำสุด epoch 83 → loss พิกัดไม่ overfit แต่ **การจำแนกคลาส (cls) overfit** |
| เวลา | ≈ 17.9 วินาที/epoch (Kaggle GPU) → 100 epoch = 1,792 วิ; epoch 37 ที่ 672 วิ |
| ข้อสังเกต | mAP(P) ตกจาก 0.8155 (ep90) → 0.7886 (ep91) ตรงกับจังหวะ `close_mosaic=10` ปิด mosaic (epoch index 90) **[J]** เป็นความบังเอิญหรือไม่ยังไม่รู้ ต้องทดลอง |
| ความสั่นของ fitness | epoch 21–60 ช่วง 1.55–1.74; ติดกัน epoch 38→39 = 1.735→1.604 |

จำลอง `EarlyStopping` บน fitness จริง: patience 10 → หยุด ep26 (best ep16); 15 → ep31; 20 → ep36 (best ep16, 1.711); **30 → ep67 (best ep37, 1.7346)**; 50 → ep87; 100 → ไม่หยุด.

**นัยของ `nbs` [V]** `trainer.py` L325: `accumulate = round(nbs/batch) = 4` → optimizer step ทุก 4 batch; 885 ภาพ/batch16 = 56 batch/epoch → **มีแค่ ~14 optimizer step ต่อ epoch (~1,400 step ทั้ง run)**. สำหรับชุดข้อมูลเล็กนี่น้อยมาก; `nbs=32` หรือ `16` จะเพิ่มจำนวน step (2–4 เท่า) โดยไม่ต้องเปลี่ยน batch **[J]** (ยังไม่ทดลอง **[U]**). weight_decay ถูกสเกลด้วย `batch*accumulate/nbs` (=1 เมื่อ nbs ใกล้ batch×accumulate) L326.

## 4. Hyperparameter ที่มีผลกับงานนี้ (pose-classification เล็ก ๆ 20 คลาส) และช่วงค้นหา

ข้อมูลของเรา [V]: train 885 ภาพ (มี `_flip` 154 ไฟล์เฉพาะ Corner_Kick, Direct_Free_Kick, Indirect_Free_Kick, Offside_Location, Card ตาม `Data_Pipeline/config/config.yaml` `flip_classes`), val 182, test 153; instance ต่อคลาสใน train 28–78 (imbalance สูงสุด ≈2.8×, Card 78/Corner 73 สูงเพราะมี flip), val 5–14 ต่อคลาส. โมเดล: backbone = layer 0–10, head `Pose26` = layer 23 [V] `cfg/models/26/yolo26-pose.yaml`.

| Hyperparameter | default | ช่วง/ค่าที่เสนอ | เหตุผลและที่มา |
|---|---|---|---|
| **`optimizer`** | auto | **AdamW** (ตายตัว); ลอง SGD ภายหลังถ้าเหลืองบ | auto เลือก AdamW อยู่แล้วที่ ~1,400 iteration [V]; ระบุชื่อเพื่อให้ `lr0` มีผล และให้ผลทดลองตีความได้ [D] modes/train. MuSGD ใช้เมื่อ iteration > 10,000 เท่านั้น (ไม่ถึงในชุดนี้). |
| **`lr0`** | 0.01 (ถูกละเลยใน auto) | AdamW: **[0.0004, 0.001]** (0.0004 ≈ ค่าที่ auto ใช้จริง = baseline เดิม) | [V] ค่า auto = 0.000417; `default.yaml` ระบุ AdamW ≈1e-3. ถ้าใช้ SGD ลอง 0.005–0.01. fine-tune จาก pretrained จึงไม่ควรสูงกว่า ~1e-3 สำหรับ AdamW **[J]**. |
| `lrf` | 0.01 | คงที่ (0.01) หรือ [0.01, 0.1] รอบหลัง | final LR = lr0·lrf [D]. ชุดเล็กที่ overfit เร็ว: LR ปลายทางต่ำช่วยให้ลู่เข้า แต่ผลกระทบรองจาก lr0. |
| **`cos_lr`** | False | **True** | cosine ตกช้าตอนต้น/เร็วตอนท้าย [V] trainer.py L272–275; ควบคุมได้ง่ายเมื่อลด `epochs`. **[J]** ไม่มีหลักฐานเชิงปริมาณว่าดีกว่า linear ในงานนี้ → ถ้าต้องการให้ชัด ให้เพิ่มเป็นมิติในรอบแรก. |
| `weight_decay` | 0.0005 | [0.0005, 0.005] (รอบหลัง) | regularization ที่แท้จริงเพียงตัวเดียวที่มี (ไม่มี dropout/label smoothing สำหรับ pose, ดูข้างล่าง). tuner ใช้ช่วง 0–0.001 [V] tuner.py L87+; ช่วงกว้างกว่านั้นเป็น **[J]**. |
| `warmup_epochs` | 3.0 | คงที่ 3.0 (หรือ 1–3) | ชุดเล็ก (56 batch/epoch) ทำให้ warmup = 168 batch; ไม่ใช่ตัวขับหลัก. ช่วงใน tuner 0–5 [V]. |
| **`epochs` + `patience`** | 100 / 100 | **epochs 80, patience 30** | best อยู่ epoch 37 ของ 100; 80 epoch + cosine ให้ LR ตกทันภายในงบ; patience 30 ทนความสั่นของ val 182 ภาพ (§3). ถ้า `epochs ≤ close_mosaic + patience` จะไม่เห็นผลของ close_mosaic ที่ดี. |
| `batch` | 16 | 16 (คงที่); ถ้าจะเพิ่มจำนวน step ให้ปรับ **`nbs`** | batch 8/16/32 ไม่เปลี่ยนจำนวน optimizer step ตราบใดที่ `nbs=64` คงที่ [V] L325. ตัวที่ขยับ dynamics จริงคือ `nbs` **[J]** (เสนอ `nbs ∈ {64, 32}` ในรอบ 2). |
| `imgsz` | 640 | 640 (คงที่) | 1 คน/ภาพ มือ/แขนอยู่ในกรอบ; 960 ช้าลง ~2× ไม่คุ้มงบ. **[J]** อาจลอง 480 เพื่อเร็วขึ้นถ้า recall ไม่ตก. |
| **`freeze`** | None | **[null, 10]** (10 = ตรึง backbone layer 0–9; 11 = ตรึง 0–10) | `freeze=N` ตรึง N layer แรก [D] modes/train; [V] trainer.py L388–396 (`range(N)`, และตรึง `.dfl` เสมอ). ชุดเล็ก+pretrained ⇒ ตรึง backbone ลด overfit ของ cls ที่เห็นใน §3 **[J]** (ต้องทดลอง **[U]**). ข้อควรระวัง: ตรึงมากเกินจะเรียนจำแนกท่าไม่พอ. |
| **`close_mosaic`** | 10 | **[10, 15]** หรือ 0 ถ้า ablation บอกว่าปิด mosaic ตลอดดีกว่า | [V] L512. สังเกตการตกที่ ep91 (§3) → ควรเทียบ `close_mosaic` ค่าต่าง ๆ กับ `mosaic=0.5`. |
| **`mosaic`** | 1.0 | **[1.0, 0.5]** | รวม 4 ภาพ → โมเดลเห็นคนหลายคน/หลายท่าต่อภาพและขนาดคนเล็กลง; ชุดเราคือ 1 คน/ภาพ จึงอาจเกิด domain gap กับภาพทดสอบ (คนใหญ่เต็มเฟรม) **[J]**. mosaic ไม่ทำ flip เอง (flip เป็น transform แยก `RandomFlip` ใช้ `fliplr`) [V] `data/augment.py` `v8_transforms` ~L2860–2915. |
| **`fliplr`** | 0.5 | **0.0 ตายตัว** (คงตามโค้ดเดิม) | flip ถูกทำ offline เฉพาะ 5 คลาสใน `flip_classes`; ถ้าเปิด `fliplr>0` จะ flip *ทุกคลาส* รวมท่าที่ซ้าย/ขวามีความหมาย (เช่น Offside_Location อยู่ใน flip_classes แต่ท่าอื่นเช่น Offside ไม่อยู่). `data.yaml` มี `flip_idx` ถูกต้องอยู่แล้ว (จึง flip keypoint ได้) แต่ต้องปิดไว้. tuner ใส่ `fliplr` ใน default space [V] → ต้องตัดออกเมื่อใช้ `model.tune()` (ดู §5). |
| `scale` | 0.5 | **[0.5, 0.3]** | ระยะกล้อง/ขนาดคนต่างกันในภาพจริง ต้องการ scale aug พอสมควร แต่ 0.5 (±50%) แรงเมื่อรวมกับ mosaic **[J]**. [D] usage/cfg. |
| `translate` | 0.1 | คงที่ 0.1 | ท่ามือต้องอยู่ในเฟรม; ค่าสูงตัดแขนออกนอกภาพ **[J]**. |
| `degrees` | 0.0 | **0–5** (เล็กน้อย) หรือคงที่ 0 | ใช้ได้กับ pose [D] usage/cfg (คีย์พอยต์ถูกหมุนตาม). ท่าบางท่าแยกด้วยทิศแขน (ขึ้น/ลง/ขวาง) จึงไม่ควรหมุนมาก **[J]**. (`augment:` ใน `config.yaml` สำหรับ two-stage ใช้ rotate 10° แต่คนละ pipeline.) |
| `hsv_h/s/v` | 0.015/0.7/0.4 | คงที่ (หรือ hsv_h 0.01, hsv_s 0.5) | เปลี่ยนสี/แสง; ไม่กระทบรูปทรงท่า. สีเสื้อผู้ตัดสินอาจเป็นสัญญาณ spurious แต่ไม่มีหลักฐานในรีโปนี้ **[U]**. ช่วงใน tuner: h 0–0.1, s/v 0–0.9 [V]. |
| `erasing` | 0.4 | **ไม่มีผลกับ pose — ข้าม** | [D] usage/cfg: "Supported tasks: classify" เท่านั้น; [V] `data/augment.py` ใช้ `RandomErasing` ใน `classify_augmentations` (L2983–3067) ไม่ใช่ใน `v8_transforms`. |
| `mixup`, `cutmix`, `copy_paste` | 0 | คงที่ 0 | mixup ผสมภาพ 2 คน/ท่า ทำ label กำกวมสำหรับท่าที่แยกกันด้วยรายละเอียดเล็ก ๆ **[J]**. `copy_paste` ใช้กับ segment/obb/semantic เท่านั้น [D]. |
| **loss gains `box`/`cls`/`pose`/`kobj`** | 7.5 / 0.5 / 12.0 / 1.0 | ส่วนใหญ่ **คงที่**; ลอง `cls` ∈ [0.5, 1.0, 2.0] ในรอบ 3 | ปัญหาหลักคือจำแนกท่า (cls) overfit/สับสน (Offside, Goal, Elbowing F1=0) ไม่ใช่ความแม่นพิกัด (val pose_loss/box_loss ลดไปถึง ep83–89) → เพิ่มน้ำหนัก `cls` ให้ gradient ของการจำแนกใหญ่ขึ้นเป็นสมมติฐานที่ทดสอบได้ **[J]**. gains อยู่ใน space ของ tuner: box 1–20, cls 0.1–4 [V] tuner.py. `pose`/`kobj` ไม่ได้อยู่ใน default space. |
| **`cls_pw`** (class-imbalance) | 0.0 | **[0.0, 0.5]** | น้ำหนักคลาส = (1/count)^cls_pw แล้ว normalize mean=1 [V] `trainer.py` L996–1021; ใช้ใน BCE cls loss ของ pose (`utils/loss.py` L466–467 ใน `v8DetectionLoss` ซึ่ง `v8PoseLoss` สืบทอด) [V]. imbalance สูงสุดแค่ ≈2.8× ⇒ cls_pw=0.5 ให้น้ำหนักต่างกัน ~1.7× เท่านั้น จึงเป็น knob ที่ปลอดภัย; cls_pw=1.0 อาจแรงเกินกับ 28 instance **[J]**. [D] modes/train. |
| `label_smoothing` | — | **ใช้ไม่ได้** | ถูกลบแล้วใน 8.4.212: `cfg/__init__.py` L597–605 `removed_keys = {"label_smoothing", ...}` (ใส่แล้วถูก drop พร้อม warning). `default.yaml` ไม่มีคีย์นี้ [V]. |
| `dropout` | 0.0 | **ไม่มีผล** | `default.yaml`: "dropout for classification head (classify only)" [V]. |
| `seed` | 0 (เราใช้ 42) | ดู §7 | seed เดียว + val 182 ภาพ = ความแปรปรวนสูง. |

> หมายเหตุสำคัญ: ความล้มเหลว F1=0 ของ Offside/Goal/Elbowing อาจมาจากข้อมูล (ท่าคล้ายกัน, GT, จำนวนตัวอย่าง) มากกว่า hyperparameter — การจูนช่วยลด overfit/ปรับ fitness แต่ **ไม่รับประกัน** แก้คลาสเหล่านี้ **[J]**.

## 5. สองวิธีจูน: ParameterGrid ของเรา vs `model.tune()`

**`model.tune()` (Tuner, genetic evolution)** — [D] https://docs.ultralytics.com/guides/hyperparameter-tuning/ ; [V] `engine/tuner.py`, `engine/model.py` L916–966
- แต่ละ iteration = เทรน 1 run เต็มความยาว `epochs`; `iterations=N` รันต่อเนื่องทีละ run (ถ้า `use_ray=False`) [D]. iteration แรกใช้ค่า default/ค่าที่ส่งเข้ามาเป็นฐาน [V] `_mutate` (ไม่มีประวัติ → คืน defaults).
- กลไก: เลือก parent จาก top-9 ถ่วงน้ำหนักด้วย fitness, mutate ~ครึ่งหนึ่งของพารามิเตอร์ ด้วย sigma=0.2 [V] `_mutate`.
- **`model.tune()` ตั้ง `optimizer="AdamW"` เป็น default อยู่แล้ว** [V] `engine/model.py` L954–955 (เว้นแต่ `space` มี `optimizer`) → ปัญหา auto/lr0 ไม่เกิดที่นี่.
- **ถ้าไม่ส่ง `space`** จะใช้ default space ซึ่งรวม `fliplr (0–1)`, `mosaic (0–1)`, `degrees (0–45)`, `translate (0–0.9)`, `flipud`, `bgr`, `mixup`, `cutmix`, `copy_paste` ฯลฯ [V] tuner.py L87–116 — **อันตรายสำหรับเรา** (fliplr ทำลายการ exclusion รายคลาส; degrees ถึง 45° ทำให้ท่าเปลี่ยนความหมาย). `space` ที่ส่งเข้าไป *แทนที่* default ทั้งหมด (`args.pop("space") or {...}`) จึงต้องระบุเอง เช่น `space={"lr0":(1e-4,2e-3),"weight_decay":(0.0,0.002),"scale":(0.2,0.7),"mosaic":(0.3,1.0),"cls":(0.3,2.0),"cls_pw":(0.0,0.7),"close_mosaic":(5,15)}`. `fliplr=0.0` ต้องส่งเป็นอาร์กิวเมนต์คงที่.
- **fitness ที่ tuner ใช้**: ค่า `fitness` ของ val (pose+box mAP50-95) [D]; ใน 8.4.212 อ่านจาก validator metrics ของ `best.pt` [V] `trainer.py` MultiTrainer.train L1417–1422.
- **ผลลัพธ์** (`runs/<task>/tune/`) [D][V]: `tune_results.ndjson` (**ไม่ใช่ `.csv` ใน 8.4.212**), `best_hyperparameters.yaml`, `tune_fitness.png`, `tune_scatter_plots.png`, `weights/best.pt|last.pt` ของ iteration ที่ดีที่สุด; `cleanup=True` ลบโฟลเดอร์ run ของ iteration อื่น.
- เอกสารแนะนำให้จูนภายใต้เงื่อนไขใกล้เคียง training จริง และเตือนว่าการจูนสั้น/เล็ก "rarely optimal" [D]; `iterations` default 300 [D]. จำนวน iteration ที่เหมาะสม (30–100) ที่เห็นในหน้าเอกสารมาจากความเห็นผู้ดูแล ไม่ใช่เนื้อหาหลักของคู่มือ → **[U]**.
- `patience`: คู่มือ tuning ไม่ได้พูดถึง early stopping; `patience` ที่ส่งเข้า `tune()` ถูกส่งต่อไปยังทุก trial ผ่าน `args` ตามปกติ (trainer ใช้ `self.args.patience`) [V] — จึงควรส่ง `patience=30` ด้วย.
- **ข้อจำกัดกับงบเรา**: 1 trial ≈ 15–20 นาที → 2–3 ชม. ≈ **6–10 trial เท่านั้น** (≈18 s/epoch ที่เห็นบน Kaggle GPU; Colab อาจต่างกัน **[U]**). จำนวนนี้น้อยกว่ามากกับที่ genetic search ต้องการเพื่อเรียนรู้จากประวัติ (การ mutate เริ่มเป็นการสุ่มรอบค่าตั้งต้น และ covariance model ใช้เมื่อ history ≥ 30 [V] `_mutate`) ⇒ ผลจะไม่ต่างจาก random search 8 จุด และผลลัพธ์ต่อ trial ถูกรบกวนด้วย noise ของ val 182 ภาพ.
- ผลของ `tune()` **ไม่ถูก log เข้า MLflow ตามโครงสร้างเดิมของเรา** (เรา `settings.update({"mlflow": False})` และ log เองต่อ trial) → ต้องอ่าน `tune_results.ndjson` แล้ว log เอง **[J]**.

**ParameterGrid ปัจจุบัน** (`Train/trainOneStage.py`): ควบคุมเต็มที่ (บังคับ `fliplr=0`, `seed`, log MLflow ต่อ trial, เก็บ `best_overall.pt`), ไม่ต้องเขียนโค้ดเพิ่ม, แต่เป็น full-factorial — จำนวน run = ผลคูณของความยาวทุก list.

**คำแนะนำ**: ใช้ **ParameterGrid แบบ 3 รอบ ๆ ละ ≤4 run (รวม ≤ ~10 run ≈ 2–3 ชม.)** เพราะ (1) งบ 6–10 trial เล็กเกินไปสำหรับ genetic search; (2) ต้อง exclude `fliplr`/จำกัด `degrees` — ใน grid ทำได้โดยปริยาย; (3) MLflow เดิมใช้ได้ทันที; (4) ตีความผลได้ (ทีละปัจจัย) ซึ่งสำคัญเมื่อ val noisy. ใช้ `model.tune()` ต่อเมื่อมีงบ ≥ 30 trial (เช่น หลายคืน/หลาย GPU) และกำหนด `space` เองตามด้านบน.

## 6. ข้อเสนอ config และอาร์กิวเมนต์ (เสนอเฉพาะในเอกสารนี้ — ไม่ได้แก้ไฟล์จริง)

เวลาโดยประมาณ [J]: epochs 80 + patience 30 → run ที่ best อยู่ราว epoch 30–50 จบที่ ~60–80 epoch ≈ 18–24 นาที/run (18 s/epoch) → รอบละ 4 run ≈ 1.2–1.6 ชม.; **ทำรอบ 1 + 2 ก็เต็มงบ 2–3 ชม.**

**รอบ 1 — optimizer / lr / freeze (4 run)**
```yaml
one_stage:
  epochs: [80]
  patience: [30]
  imgsz: [640]
  batch: [16]
  optimizer: [AdamW]      # บังคับ, ไม่งั้น lr0 ถูกละเลย
  lr0: [0.0004, 0.001]    # 0.0004 = ค่าที่ auto เลือกเดิม (baseline)
  cos_lr: [true]
  freeze: [null, 10]      # 10 = ตรึง backbone layer 0-9
  close_mosaic: [10]
```
`ParameterGrid` จะส่ง `optimizer`, `patience`, `cos_lr`, `freeze` ... เข้า `model.train(**p)` โดยตรง (บรรทัด `args = dict(..., fliplr=0.0, seed=42, exist_ok=True, **p)`) จึงไม่ต้องแก้โค้ด. YAML `null` → `None` (ใช้ได้กับ `freeze`).

**รอบ 2 — augmentation (คงค่าชนะจากรอบ 1; 4 run)**
```yaml
one_stage:
  epochs: [80]
  patience: [30]
  optimizer: [AdamW]
  lr0: [<ชนะรอบ1>]
  freeze: [<ชนะรอบ1>]
  cos_lr: [true]
  mosaic: [1.0, 0.5]
  scale: [0.5, 0.3]
```

**รอบ 3 (ถ้ายังมีเวลา, 2–4 run)**: `cls_pw: [0.0, 0.5]` × (`close_mosaic: [10, 15]` หรือ `cls: [0.5, 1.0]` หรือ `nbs: [64, 32]` เลือกทีละมิติ). จากนั้นเทรน config ที่ดีที่สุดซ้ำด้วย **seed ต่างกัน 2–3 ค่า** ก่อนสรุป (§7).

อาร์กิวเมนต์สุดท้ายต่อ run (ตัวอย่างค่า):
```python
model.train(data=..., device=..., project=..., name=f"trial{k}", exist_ok=True,
            epochs=80, patience=30, imgsz=640, batch=16,
            optimizer="AdamW", lr0=0.0004, cos_lr=True, freeze=None, close_mosaic=10,
            fliplr=0.0,            # คงเดิม: flip ทำ offline
            seed=42)
```
ถ้าต้องการเทียบ "ก่อน/หลัง" อย่างยุติธรรม: เพิ่ม baseline เดิม (`optimizer=auto`, `patience=100`) เป็น trial อ้างอิงที่ seed เดียวกัน (ผลเดิมของ trial0 ใช้ได้เลย: fitness best = 1.7346).

(ทางเลือกถ้าอยากใช้ `model.tune()` จริง ๆ)
```python
YOLO("yolo26n-pose.pt").tune(
    data=..., epochs=60, iterations=10, patience=20, fliplr=0.0, seed=42, plots=False,
    space={"lr0": (1e-4, 2e-3), "weight_decay": (0.0, 0.002), "scale": (0.2, 0.7),
           "mosaic": (0.3, 1.0), "cls": (0.3, 2.0), "cls_pw": (0.0, 0.7)})
# optimizer="AdamW" เป็น default ของ tune() อยู่แล้ว (model.py L954-955)
```

## 7. ข้อควรระวัง

- **เลือกบน val, รายงานบน test**: ทุกการตัดสินใจ (best trial, patience, epoch ที่เลือก, threshold) ใช้ val เท่านั้น; **ห้ามแตะ test (153 ภาพ) ระหว่างจูน** และรัน `Evaluate/evaluateOneStage.py` บน test **ครั้งเดียวต่อ config สุดท้าย**. Early stopping + เลือก `best.pt` จาก val เป็น selection bias ที่ทำให้ val fitness (1.7346) สูงกว่าความจริง — ผล test ที่ macro-F1 0.72 จึงควรเป็นตัวเลขที่เชื่อถือ ไม่ใช่ val.
- **Val เล็กมาก (182 ภาพ, 5–14 instance/คลาส)** ⇒ fitness สั่นระหว่าง epoch ±0.05–0.10 (§3) และความต่างระหว่าง config ที่ <~0.02–0.03 อาจเป็น noise **[J]** (ไม่ได้วัดความแปรปรวนข้าม seed **[U]**). ให้รัน config ที่ดีที่สุด 2 อันซ้ำ ≥3 seed ก่อนสรุป. `seed=42` ตายตัวใน trainOneStage ทำให้ทุก trial ได้ลำดับข้อมูลเดียวกัน ซึ่งช่วยเทียบแต่ซ่อนความแปรปรวน.
- **fitness ≠ macro-F1**: fitness ของ Ultralytics = mAP50-95 รวม box+pose; box mAP ถูกเป่าด้วย GT จาก pre-label. ถ้ามีเวลา ให้คำนวณ per-person macro-F1 บน val ของ `best.pt` ของ top-2 trial เพื่อ tie-break **[J]**.
- **ภาพ near-duplicate (burst)** ทำให้ val กับ train ใกล้กันกว่าที่ดูจาก 182 ภาพ ถ้า val แยกตาม burst แล้ว (test แยกแล้วตามข้อมูลที่ให้มา) การเลือกบน val จึงยังโอเค แต่ภาพใน train ที่เหมือนกันเองทำให้ overfit เร็ว — เป็นเหตุผลสนับสนุน `freeze`/`weight_decay`/patience (**[J]**).
- **`close_mosaic` กับ early stop**: ถ้า run หยุดก่อน `epochs - close_mosaic` mosaic ไม่เคยปิด; best.pt จะมาจากช่วงที่ mosaic ยังเปิด. ตัดสินว่ายอมรับหรือไม่ผ่านรอบ 2.
- **MLflow**: `trainOneStage.py` `mlflow.log_params({**args,...})` จะบันทึก `optimizer`, `patience`, ฯลฯ อัตโนมัติ (มาจาก `p`). ข้อควรระวัง: ถ้าเป็น `optimizer=auto` args ที่ส่งเข้าไปยังเป็น "auto" ใน MLflow ขณะที่ค่าจริงถูกเขียนทับภายใน (`self.args.optimizer/lr0` ใน build_optimizer) — อ่านค่าจริงจาก `args.yaml` ของ run. แนะนำ log เพิ่ม: `best_epoch`, จำนวน epoch ที่รันจริง, และ `results.csv` เป็น artifact. อย่าทับผล: เปลี่ยน `--project` ต่อรอบ.
- **พฤติกรรมของ `time`/`epochs`**: ถ้าใช้ `time=` ค่า `epochs` ถูกคำนวณใหม่หลัง epoch แรก และ schedule เปลี่ยนตาม [V] trainer.py L690–697 — อย่าผสมกับ grid ของ `epochs`.
- **ไม่ได้ตรวจ**: ความเร็วจริงบน Colab (ใช้ตัวเลข Kaggle), ผลเชิงปริมาณของ `freeze`/`nbs`/`cos_lr`/`mosaic` กับชุดนี้ (ทั้งหมดเป็นสมมติฐานที่ต้องทดลอง), และ log เชิงลึกของ MLflow integration ภายใน Ultralytics ระหว่าง `tune()` **[U]**.

## 8. Sources

เอกสารทางการ (ดึงเมื่อ 2026-11-14)
- https://docs.ultralytics.com/guides/hyperparameter-tuning/ (genetic algorithm, search space, outputs, fitness, iterations/epochs)
- https://docs.ultralytics.com/modes/train/ (patience, freeze, optimizer auto / `lr0` ignored, close_mosaic, cos_lr, lrf, warmup_epochs, cls_pw, time, save_period)
- https://docs.ultralytics.com/usage/cfg/ (augmentation args และ task ที่รองรับ: `erasing` = classify, `mosaic`/`degrees`/`translate` ฯลฯ)

Source ที่ติดตั้ง (Ultralytics 8.4.212, `C:\Users\jack2\anaconda3\Lib\site-packages\ultralytics\`)
- `cfg/default.yaml` (ค่า default ทั้งหมด; ไม่มี `label_smoothing`; `dropout` = classify only; `cls_pw`)
- `cfg/__init__.py` (L203–277 ชนิด/ช่วงของ key; L597–605 `removed_keys` รวม `label_smoothing`)
- `engine/trainer.py` (L270–281 scheduler/warmup; L325–338 accumulate/weight_decay/iterations; L388–396 freeze; L467 stopper; L512 close_mosaic; L665–678 validate + stopper; L851–854 best/last/save_period; L996–1021 class weights; L1053–1070 `final_eval`; L1203+ `build_optimizer` (auto); L1343–1443 `MultiTrainer`)
- `utils/torch_utils.py` L1120–1169 `EarlyStopping`
- `utils/metrics.py` L1015–1018 `Metric.fitness` ([0,0,0,1]); L1547–1549 `PoseMetrics.fitness`
- `utils/loss.py` L378–380, L466–467 (class_weights ใน BCE), L769–770, L908–911 (gain `pose`/`kobj`/`rle`)
- `engine/tuner.py` (L87–116 default space; `_mutate`; ผลลัพธ์ `tune_results.ndjson`, `best_hyperparameters.yaml`)
- `engine/model.py` L911 (metrics หลัง train), L916–966 (`tune`, `optimizer` default AdamW)
- `data/augment.py` (`v8_transforms` ~L2860–2915; `classify_augmentations` L2983–3067 มี `erasing`)
- `cfg/models/26/yolo26-pose.yaml` (backbone 0–10, head layer 23 `Pose26`)

ไฟล์ในรีโป (`C:\Users\jack2\OneDrive - Panyapiwat Institute of Management\E - Learning - 1.2 - 69\Automate_Evaluate_Billing\Machine-Learning\Mini-Project\`)
- `Train/trainOneStage.py`, `Train/config.yaml`, `Train/README.md`
- `Train/results/runs/one_stage/trial0/{args.yaml,results.csv}`, `trial1/{args.yaml,results.csv}` (diff: `args.yaml` ต่างแค่ name/lr0/save_dir; `results.csv` ต่างกัน 0.0 ทุกคอลัมน์ ยกเว้น `time` ที่ไม่ได้เทียบ)
- `Data_Pipeline/output/dataset/data.yaml` และ `labels/{train,val,test}` (นับ instance/ภาพ; train 885 ภาพ รวม `_flip` 154)
- `Data_Pipeline/config/config.yaml` (`flip_classes`)
- `Evaluate/output/one_stage/metrics.json` (test macro-F1 0.7202, accuracy 0.7338)
