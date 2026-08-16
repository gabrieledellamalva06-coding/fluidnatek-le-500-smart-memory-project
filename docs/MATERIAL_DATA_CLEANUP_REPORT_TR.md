# Material Data Cleanup Raporu

Bu rapor 16 Ağustos 2026 tarihli read-only Material Audit çıktısından hazırlanmıştır. Bu turda Firestore verisi değiştirilmemiş, kayıt silinmemiş ve kategori düzeltmesi yapılmamıştır.

## Açıkça yanlış veya placeholder olarak işaretlenen kayıtlar

| Material ID | Canonical name | Mevcut category | Önerilen işlem |
|---|---|---|---|
| `e8c4f7a7-c186-4d8a-9473-83c5cf045a80` | 2. MATERIAL | polymer | Kaynağı araştır; placeholder ise arşivleme/silme için ayrıca onay al. |
| `XLS_MAT_d42b4a46-a56a-5156-a24a-1d7091bab490` | Blue shimmer | polymer | Doğru malzeme türünü belirle; polymer listesinden çıkarma için onay al. |
| `XLS_MAT_c11a030a-a5f6-55ea-a81f-c3cf04038e76` | Gold sheen | polymer | Doğru malzeme türünü belirle; polymer listesinden çıkarma için onay al. |
| `XLS_MAT_9828c82e-8651-5237-8d36-17f0e54f1562` | Green shimmer | polymer | Doğru malzeme türünü belirle; polymer listesinden çıkarma için onay al. |
| `XLS_MAT_a29316b1-4f86-5504-8aa0-34c2ee89398f` | NXT Ruby red | polymer | Doğru malzeme türünü belirle; polymer listesinden çıkarma için onay al. |
| `XLS_MAT_207a0040-3b1a-55f5-8c49-54ec4c0c01cd` | ORANGE AMBER | polymer | Doğru malzeme türünü belirle; polymer listesinden çıkarma için onay al. |
| `XLS_MAT_184830de-4217-5d1e-a2ad-2bcab7778286` | Propylene glycol | polymer | Muhtemel yanlış kategori; solvent/yardımcı madde sınıflandırması için uzman onayı al. |

## Manual classification required

| Material ID | Canonical name | Mevcut category | Neden manuel inceleme gerekli? |
|---|---|---|---|
| `XLS_MAT_0c427d37-92eb-54ed-b252-948fad2a071e` | Frost SL | polymer | İsim tek başına kimyasal kimliği göstermiyor. |
| `XLS_MAT_7b8001bb-3961-50e5-8a24-5e72195751e3` | HONEY PK | polymer | Ticari/test adı olabilir; kimyasal metadata yok. |
| `XLS_MAT_c01ea972-8237-5ac3-9496-94207c84ea72` | XP-034 - Xel01 | polymer | İç kod görünüyor; bileşim ve sınıf doğrulanamıyor. |

## Onay sınırı

Bu kayıtlar için Firestore write, migration, delete veya otomatik category değişikliği yapılmamalıdır. Düzeltme ancak kayıt sahibi veya malzeme uzmanı sınıflandırmayı doğruladıktan ve açık onay verdikten sonra yapılmalıdır.
