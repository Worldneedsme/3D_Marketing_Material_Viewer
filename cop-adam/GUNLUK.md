# Günlük üretim akışı

Her gün 3 çöp adam videosu: **sabah**, **öğle** ve **akşam** paylaşımı için. Konular her zaman o günün Türkiye gündeminden seçilir. Konular önce onaya sunulur; onay gelmeden hiçbir şey üretilmez.

## 1. Gündemi araştır (her sabah)

- X (Twitter) Türkiye gündemi: <https://trends24.in/turkey/> (X'in kendisi giriş istiyor; giriş yapma, şifre girme).
- Gerekirse bir gündem maddesini web aramasıyla doğrula: ne oldu, ne zaman (ör. maç saati, sınav tarihi).
- Gündemdeki maddeleri şöyle ayıkla:
  - **Alma:** Siyaset ve parti tartışmaları, seçim sloganları, etnik kimlik ("Türk/Türkiyeli" vb.), din, göçmenler. Gerçek kişi, banka, şirket, kulüp adı ya da logosu kullanılmaz. Devlet kurumlarını aşağılayan bir şey yapılmaz.
  - **Al:** Herkesin kendini bulabileceği günlük hayat, milli/özel günler, maçlar (takımlar sadece renkle ima edilir), sınavlar, ekonomiyle ilgili alışkanlıklar, gündemdeki olayların genel dersleri (kimseyi isim vermeden).

## 2. Üç konu öner ve onay iste

Her konu için:

- Saati: **Sabah** (08:00–09:00), **Öğle** (12:00–13:00), **Akşam** (19:00–21:00). Konuyu gündeme göre saate yerleştir (ör. akşam maçı varsa maç videosu akşama).
- Gündemdeki karşılığı (hangi trend, neden bugün).
- İki taraf: `SOL (haksız çıkan) ↔ SAĞ (haklı çıkan)`. Başlıklar **kısa ve öz** olsun (1–2 kelime ideal, en fazla ~20 karakter).
- 3–4 cümlelik sahne akışı ve son yazı (mümkünse bir Türk atasözü).

Sonra kullanıcıya sor: üçünü de onaylıyor mu, hangisini değiştirmek istiyor. **Onay gelmeden sahne yazma, render alma.**

## 3. Onaydan sonra üret

Her video için:

1. `src/scenes/<isim>.js` sahnesini yaz. Var olan sahnelerden (`safak.js`, `yerli.js`, `beslenme.js`, `fon.js`) kalıpları kullan; [README.md](README.md) parçaları anlatıyor.
2. Kurallar:
   - 1080×1920, 11–15 sn. İlk 1,5 saniyede hareket olsun.
   - Kazanan taraf konuşmaz; kaybedenin düşünceleri küçük yazılarla görünür. Kaybeden sevimli kalsın, aşağılanmasın (kilo, görünüş, meslek üzerinden dalga yok).
   - Marka, logo, gerçek isim yok. Ürünler özgün tasarım.
   - Bayrak ve milli semboller saygılı kullanılır: önünden bir şey geçip kapatmasın; bir şeyin gölgesi ya da şekli haç gibi istenmeyen bir şekle benzemesin.
   - IK ile el hedefi veren her durumda pelvis `STAND_HIP` yüksekliğinde verilsin (`pos: [x, STAND_HIP, z]`), yoksa kollar havaya kalkar.
3. Kontrol: `node render.mjs <isim> --stills 1,3,5,...` ile kareleri al, birleştirip bak, sorunları düzelt.
4. Render: `node render.mjs <isim>` (GPU ile ~1 dk). Tam videodan saniyede bir kare alıp tekrar bak.
5. Açıklama: [instagram/INSTAGRAM.md](instagram/INSTAGRAM.md) dosyasına yeni bölüm ekle, onaylanmış tarzda:
   - Samimi, sohbet tonunda; 3–5 satır hikâye, kazanan tarafı öven bir cümle.
   - Sonda: `💬 Yorumlara yaz, sen hangisisin?` ve `1️⃣ … 2️⃣ …`
   - **Hashtag yok.** Kulağa kötü gelen kelimelerden kaçın.
   - Sabitlenecek yorum: `Ben 2'yim … Sen hangisisin? …` + kolay bir ek soru.
6. [README.md](README.md) tablosuna ve [FIKIRLER.md](FIKIRLER.md) listesine satır ekle.

## 4. Teslim

- Üç videoyu (`out/<isim>.mp4`) kullanıcıya gönder; her biri için paylaşım saatini ve açıklamayı yaz.
- Commit/push sadece kullanıcı isterse.

## Ortam notları

- Node.js, ffmpeg ve Playwright Chromium kurulu. PowerShell'de PATH'i tazelemek için:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- Git: `C:\Program Files\Git\cmd\git.exe`.
