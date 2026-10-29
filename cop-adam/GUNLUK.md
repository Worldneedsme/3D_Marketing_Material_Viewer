# Günlük üretim akışı

Her gün 3 çöp adam videosu: **sabah**, **öğle** ve **akşam** paylaşımı için. Gündem günde üç kez taranır ve her taramada tek bir post hazırlanır: **08:00** sabah postu, **12:00** öğle postu, **18:00** akşam postu (her biri ayrı zamanlanmış rutin). Konular her zaman o anki Türkiye gündeminden seçilir. Konu önce onaya sunulur; onay gelmeden hiçbir şey üretilmez.

## 1. Gündemi araştır (08:00, 12:00, 18:00)

- X (Twitter) Türkiye gündemi: <https://trends24.in/turkey/> (X'in kendisi giriş istiyor; giriş yapma, şifre girme).
- Gerekirse bir gündem maddesini web aramasıyla doğrula: ne oldu, ne zaman (ör. maç saati, sınav tarihi).
- Gündemdeki maddeleri şöyle ayıkla:
  - **Siyaset serbest (28.10.2026, kullanıcı isteği):** Siyasi gündem konu olabilir, ama olaydan herkesin hayatında yaşadığı bir ikilem çıkarılır. Videoda ve açıklamada kişi, parti ya da kurum adı, logosu, sloganı yok. Süren bir soruşturma ya da davadaki gerçek kişileri suçlu gösteren, iddiayı olay gibi anlatan bir şey yapılmaz (masumiyet karinesi, hakaret riski).
  - **Alma:** Etnik kimlik ("Türk/Türkiyeli" vb.), din, göçmenler. Gerçek kişi, banka, şirket, kulüp, parti adı ya da logosu kullanılmaz. Devlet kurumlarını aşağılayan bir şey yapılmaz.
  - **Al:** Herkesin kendini bulabileceği günlük hayat, milli/özel günler, maçlar (takımlar sadece renkle ima edilir), sınavlar, ekonomiyle ilgili alışkanlıklar, gündemdeki olayların genel dersleri (kimseyi isim vermeden).

## 2. O saatin postu için konu öner ve onay iste

O saatin postu için 2–3 aday çıkar, birini öner. Her aday için:

- Paylaşım saati: **Sabah** (08:00–09:00), **Öğle** (12:00–13:00), **Akşam** (19:00–21:00). Bugün önceki taramalarda yapılan konuları tekrar etme (FIKIRLER.md).
- Gündemdeki karşılığı (hangi trend, neden bugün).
- İki taraf: `SOL ↔ SAĞ`, iki savunulabilir seçim (28.10.2026'ya kadar SOL haksız, SAĞ haklıydı; artık değil, aşağıya bak). Başlıklar **kısa ve öz** olsun (1–2 kelime ideal, en fazla ~20 karakter).
- 3–4 cümlelik sahne akışı ve son yazı (mümkünse bir Türk atasözü).
- Tek cümleyle "yorumda iki taraf ne diyecek" tahmini (tartışma neden kızışacak).

### Tartışma dozu yüksek içerik (28.10.2026, kullanıcı isteği)
Kanal tartışmayla büyüyor: bedelli askerlik 5,8 B beğeni / 249 yorum, borçla düğün 1,5 B / 28, holigan-sporsever 1,1 B / 27. Cevabı belli öğütler (pazartesi, balta, yetenek) 0-1 yorumda kaldı.
- **Her aday ve her post en yüksek dozda tartışmalıdır.** Düşük/orta dozlu aday (cevabı belli öğüt) önerilmez.
- Her konu **o anki trendden** çıkar; trende bağlamak için her zaman uğraşılır, trendsiz aday önerilmez. Konu: trenddeki olayın herkesin kendi hayatında yaşadığı bir ikilemi (bedelli ↔ askerlik, düğün ↔ ev, memleket ↔ tatil, hesabı kim öder, çocuğa telefon yaşı, arkadaşa borç, maaşı söylemek, garantili iş ↔ kendi işi).
- **İki taraf her zaman isimli başlıkla durur** (SABREDEN ↔ SABREDEMEYEN, BEDELLİ YAPAN ↔ ASKERLİK YAPAN gibi; 1–2 kelime, en fazla ~20 karakter). Bu format değişmez.
- SOL/SAĞ artık "haksız/haklı" değil, iki seçimdir: iki tarafın da kazancı ve bedeli gösterilir, izleyici kendini iki tarafta da bulabilir. Son yazı kesin hüküm yerine tarafa çağırır ("Sen olsan hangisi?") ya da iki tarafın da sahiplendiği bir atasözü olur. Açıklamadaki 1️⃣/2️⃣ seçenekleri de iki tarafı eşit tartar.
- Grup aşağılanmaz, kimse küçük düşürülmez; davranış tartışılır. Yukarıdaki "Alma" listesi (etnik kimlik, din, göçmen, isim/logo) aynen geçerli; siyaset artık serbest ama isimsiz.

Sonra kullanıcıya bildirim gönder ve sor: hangi aday, ya da değişiklik var mı. **Onay gelmeden sahne yazma, render alma.**

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
