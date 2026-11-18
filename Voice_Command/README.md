# Voice_Command — ชุดข้อมูลคำสั่งเสียงภาษาไทย 20 ท่าสัญญาณ

ชุดข้อความคำสั่ง (text) ภาษาไทยสำหรับระบุท่าสัญญาณผู้ตัดสินฟุตบอล 20 ท่า เช่น "อยากฝึกท่า direct free kick", "เช็คแฮนด์บอลหน่อย", "ขอท่าทดเวลาบาดเจ็บ"
ครอบคลุมภาษาทางการ ภาษาพูด คำทับศัพท์ และภาษาอังกฤษ

```bash
pip install -r Voice_Command/requirements.txt
python Voice_Command/src/main.py        # สร้างใหม่ทั้งหมด (seed คงที่ ได้ผลเหมือนเดิมทุกครั้ง)
```

## โครงสร้าง

```
src/seedData.py      ชื่อท่าแต่ละคลาส (formal/colloquial/translit/english) + ประโยคสถานการณ์เขียนมือ + แม่แบบคำสั่ง
src/buildCorpus.py   สร้างประโยคดิบ 50 ประโยค/คลาส = สถานการณ์ 8 + แม่แบบ x ชื่อท่า 42 (ทุกชื่อท่าถูกใช้อย่างน้อย 1 ครั้ง)
src/textUtils.py     normalize + ตัดคำ newmm (เพิ่มพจนานุกรมศัพท์ฟุตบอล) + stopwords
src/augment.py       augmentation (เฉพาะ train)
src/main.py          รวมทุกขั้น: build -> split -> augment -> tokenize -> save -> stats
data/raw/corpus.csv  ประโยคต้นฉบับ 1,000 ประโยค
data/processed/      train/val/test (.csv + .json), stats.json, stats.md
```

## ขั้นตอน

1. **Corpus** — 20 คลาส x 50 ประโยค = 1,000 ประโยค (balanced)
2. **Split** — stratified ต่อคลาส 80/10/10 = 800 / 100 / 100 ทำ *ก่อน* augment เพื่อไม่ให้ประโยคพี่น้องรั่วไป val/test
3. **Augmentation (train เท่านั้น)** — ประโยคละ 2 แบบ สุ่ม 1–2 วิธี:
   - `spelling` ตัวสะกดต่าง/คำพ้องรูปของคำทับศัพท์ (เช็ค↔เช็ก, ฟรีคิก↔ฟรีคิค, แฮนด์บอล↔แฮนบอล)
   - `synonym` คำพ้องความหมายของคำสั่ง (ฝึก↔ซ้อม, กรรมการ↔ผู้ตัดสิน, ยังไง↔อย่างไร)
   - `alias` สลับชื่อท่าเป็นชื่ออื่นของคลาสเดียวกัน (ใบแดง↔เรดการ์ด↔red card)
   - `spoken` สำนวนพูด เติมคำลงท้าย/ขึ้นต้น (ครับ, นะ, หน่อยนะคะ, เอ่อ, รบกวน)
   - ประโยคที่ augment แล้วซ้ำกับ val/test จะถูกทิ้ง → train 2,400 (ต้นฉบับ 800 + augmented 1,600)
4. **Preprocessing** — `clean_text` (normalize ไทย, ตัวเล็ก, ยุบช่องว่าง) → `newmm` + พจนานุกรมศัพท์ฟุตบอล → ลบ stopwords
   - stopword = PyThaiNLP **ลบ** `KEEP_WORDS` (คำที่แยกคลาส เช่น `ไม่` นับประตู, ฟรีคิก`ตรง`, `เปลี่ยน`ตัว, เล่น`ต่อ`, ไล่`ออก`, เวลา`นอก`)
     **บวก** `DOMAIN_STOPWORDS` (คำสั่งที่มีเท่ากันทุกคลาส เช่น ท่า, ฝึก, ทำ, ครับ)

## คอลัมน์

| คอลัมน์ | ความหมาย |
|---|---|
| `text` / `text_clean` | ประโยคต้นฉบับ / หลัง normalize |
| `tokens` / `tokens_nostop` | ผลตัดคำ (CSV คั่นด้วย `\|`, JSON เป็น list) / หลังลบ stopword |
| `label`, `label_id` | คลาสฝั่งเสียง 0–19 |
| `vision_class_id` | id ของคลาสเดียวกันในโมเดลภาพ (README หลัก) — ใบเหลือง/ใบแดงแยกกันฝั่งเสียง แต่ map ไปที่ `3 Card` เหมือนกัน |
| `style` | situation / formal / colloquial / translit / english |
| `source`, `aug_method` | original / augmented และวิธีที่ใช้ |

## ผลลัพธ์ (seed 42)

ดูตารางเต็มใน [`data/processed/stats.md`](data/processed/stats.md)

| split | ทั้งหมด | ต่อคลาส | vocab (ไม่รวม stopword) |
|---|---:|---:|---:|
| train | 2,400 | 120 | 450 |
| val | 100 | 5 | 158 |
| test | 100 | 5 | 155 |

Vocabulary ทั้งชุด 609 คำ (หลังลบ stopword 478) · OOV ของ val/test เทียบ train ≈ 5%

Sanity check (TF-IDF + Logistic Regression บน `tokens_nostop`): val acc 0.94, test acc 0.92 — ที่ผิดส่วนใหญ่เป็นประโยคสถานการณ์ที่ไม่เอ่ยชื่อท่า (ข้อมูลยาก ตั้งใจใส่ไว้)

## ข้อจำกัด

- ประโยคแม่แบบใช้โครงเดียวกันข้ามคลาส ผลบน test จึงอาจดีกว่าการใช้งานจริง ควรเก็บประโยคจากผู้ใช้จริงเพิ่ม
- เป็นข้อความ ยังไม่ผ่าน ASR จริง (ยังไม่มีคำผิดแบบที่เกิดจากการถอดเสียง)
