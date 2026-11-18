# สถิติชุดข้อมูลคำสั่งเสียง (Voice Command Corpus)

seed = 42 · ต้นฉบับ 50 ประโยค/คลาส · augment 2 ประโยค/ประโยค train

## ภาพรวม

| split | ทั้งหมด | ต้นฉบับ | augmented | vocab | vocab (ไม่รวม stopword) | token เฉลี่ย | OOV เทียบ train |
|---|---:|---:|---:|---:|---:|---:|---:|
| train | 2400 | 800 | 1600 | 577 | 450 | 6.55 | - |
| val | 100 | 100 | 0 | 214 | 158 | 5.86 | 0.0554 |
| test | 100 | 100 | 0 | 219 | 155 | 6.2 | 0.05 |

**Vocabulary ทั้งชุด:** 609 คำ (หลังลบ stopword 478 คำ)

## Class Distribution

| id | class | vision id | train | val | test | รวม |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Indirect_Free_Kick | 1 | 120 | 5 | 5 | 130 |
| 1 | Direct_Free_Kick | 2 | 120 | 5 | 5 | 130 |
| 2 | Yellow_Card | 3 | 120 | 5 | 5 | 130 |
| 3 | Red_Card | 3 | 120 | 5 | 5 | 130 |
| 4 | Play_On | 4 | 120 | 5 | 5 | 130 |
| 5 | Penalty_Kick | 5 | 120 | 5 | 5 | 130 |
| 6 | Offside | 6 | 120 | 5 | 5 | 130 |
| 7 | Offside_Location | 7 | 120 | 5 | 5 | 130 |
| 8 | Substitution | 8 | 120 | 5 | 5 | 130 |
| 9 | Goal | 9 | 120 | 5 | 5 | 130 |
| 10 | Disallowed_Goal | 10 | 120 | 5 | 5 | 130 |
| 11 | Time_out | 11 | 120 | 5 | 5 | 130 |
| 12 | Corner_Kick | 12 | 120 | 5 | 5 | 130 |
| 13 | Jumping | 13 | 120 | 5 | 5 | 130 |
| 14 | Obstruction | 14 | 120 | 5 | 5 | 130 |
| 15 | Pushing | 15 | 120 | 5 | 5 | 130 |
| 16 | Hand_Ball | 16 | 120 | 5 | 5 | 130 |
| 17 | Elbowing | 17 | 120 | 5 | 5 | 130 |
| 18 | Tripping | 18 | 120 | 5 | 5 | 130 |
| 19 | Kicking | 19 | 120 | 5 | 5 | 130 |

## ระดับภาษาของประโยคต้นฉบับ (train/val/test)

| style | train | val | test |
|---|---:|---:|---:|
| situation | 129 | 13 | 18 |
| formal | 188 | 22 | 18 |
| colloquial | 192 | 23 | 23 |
| translit | 137 | 25 | 16 |
| english | 154 | 17 | 25 |

## วิธี augment (train)

| method | จำนวน |
|---|---:|
| spoken | 379 |
| synonym | 362 |
| alias | 266 |
| synonym+spoken | 166 |
| alias+synonym | 123 |
| alias+spoken | 121 |
| spelling | 81 |
| alias+spelling | 35 |
| spelling+spoken | 35 |
| spelling+synonym | 32 |

## คำที่พบบ่อยต่อคลาส (train, ไม่รวม stopword)

| class | top tokens |
|---|---|
| Indirect_Free_Kick | ฟรีคิก · โดยอ้อม · สอง · เตะโทษ · ให้สัญญาณ · indirect |
| Direct_Free_Kick | ฟรีคิก · free · kick · ตรง · ยิง · เตะโทษ |
| Yellow_Card | ใบเหลือง · การ์ด · เหลือง · ใบ · คาดโทษ · โดน |
| Red_Card | แดง · ไล่ออก · การ์ด · off · มือ · ออกจาก |
| Play_On | ความได้เปรียบ · advantage · ไม่ · ปล่อย · แอดวานเทจ · ต่อ |
| Penalty_Kick | จุดโทษ · ชี้ · เตะ · ลูกโทษ · จุด · penalty |
| Offside | ล้ำ · ล้ำหน้า · ยกธง · offside · สัญญาณ · มือ |
| Offside_Location | ล้ำ · ตำแหน่ง · ชี้ · ล้ำหน้า · จุด · ธง |
| Substitution | มือ · ซับ · การเปลี่ยนตัว · ผู้เล่น · เปลี่ยนตัว · สัญญาณ |
| Goal | ประตู · นับ · goal · มือ · scored · เข้า |
| Disallowed_Goal | ประตู · ไม่ · นับ · มือ · goal · disallowed |
| Time_out | หยุด · เวลานอก · เกม · มือ · การแข่งขัน · สัญญาณ |
| Corner_Kick | มุม · เตะมุม · corner · เตะ · ชี้ · ลูกมุม |
| Jumping | กระโดด · เข้าใส่ · ใส่ · คู่แข่ง · มือ · jumping |
| Obstruction | มือ · impeding · ขัดขวาง · ยืน · คู่แข่ง · ทาง |
| Pushing | มือ · ผลัก · ดัน · การผลัก · pushing · คู่แข่ง |
| Hand_Ball | มือ · บอล · โดน · hand · ball · แขน |
| Elbowing | ศอก · ใช้ · มือ · ฟาวล์ · คู่แข่ง · ถอง |
| Tripping | ขัดขา · ขา · trip · ล้ม · ให้สัญญาณ · คู่แข่ง |
| Kicking | เตะ · ฟาวล์ · คู่แข่ง · ขา · kick · foul |
