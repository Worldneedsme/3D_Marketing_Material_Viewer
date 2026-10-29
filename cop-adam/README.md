# Çöp adam video üretici

Siyah zeminli 3D çöp adam videoları üretir. İki fikri iki çöp adamla karşılaştırır. Çıktı 1080×1920 dikey MP4'tür (TikTok, Reels, Shorts), içinde ses efektleri de vardır.

Fikir listesi ve sahne akışları: [FIKIRLER.md](FIKIRLER.md)

Instagram sayfası (isim, profil resmi, biyografi, açıklamalar, kapaklar): [instagram/INSTAGRAM.md](instagram/INSTAGRAM.md)

## Hazır sahneler

| Sahne | Etiketler | Süre |
|---|---|---|
| `atlama` | KAFASINDA KURAN ↔ YAPAN | 16,5 sn |
| `kazi` | PES EDEN ↔ DEVAM EDEN | 15 sn |
| `birikim` | HARCAYAN ↔ BİRİKTİREN | 15,5 sn |
| `veresiye` | VERESİYE VEREN ↔ PEŞİN SATAN | 16 sn |
| `duvar` | BAHANE BULAN ↔ YOL BULAN | 16,5 sn |
| `balta` | "VAKTİM YOK" DİYEN ↔ BALTASINI BİLEYEN | 15 sn |
| `safak` | ŞAFAK SAYAN ↔ ŞAFAĞI DEĞERLENDİREN | 11 sn |
| `bedelli` | BEDELLİ YAPAN ↔ ASKERLİK YAPAN | 11 sn |
| `yerli` | "DIŞARISI DAHA İYİ" DİYEN ↔ YERLİ ÜRETEN | 15 sn |
| `beslenme` | FAST FOOD YİYEN ↔ EVDE YEMEK YAPAN | 14 sn |
| `fon` | SORGULAMADAN İNANAN ↔ ARAŞTIRAN | 13,5 sn |
| `pazartesi` | PAZARTESİCİ ↔ BUGÜNCÜ | 13,8 sn |
| `yetenek` | YETENEKLİ ↔ EMEKÇİ | 13,5 sn |
| `derbi` | KÜSEN ↔ DOST KALAN | 13,5 sn |
| `kapisma` | SARI-KIRMIZI ↔ SARI-LACİVERT (donan final, "KİM KAZANIR?") | 12,5 sn |
| `gol` | SARI-KIRMIZI ↔ SARI-LACİVERT (sarı-kırmızı golüyle) | 13,5 sn |
| `holigan` | HOLİGAN ↔ SPORSEVER | 13,5 sn |
| `dugun` | BORÇLA DÜĞÜN ↔ SADE DÜĞÜN | 14 sn |
| `tablet` | TABLET VEREN ↔ VAKİT AYIRAN | 14,5 sn |
| `bayrak` | SON GÜNCÜ ↔ HAZIRLIKLI (28 Ekim gecesi) | 14,5 sn |
| `taksi` | YOLCU SEÇEN ↔ İŞİNİ SEVEN | 16 sn |
| `zam` | İDARE EDEN ↔ AÇIK KONUŞAN | 15 sn |
| `yks` | SAYAÇ SAYAN ↔ SORU ÇÖZEN | 14,5 sn |
| `garanti` | GARANTİCİ ↔ RİSKÇİ | 14,6 sn |
| `kutlama` | MEYDANA İNEN ↔ EVDE KUTLAYAN (29 Ekim akşamı) | 14,5 sn |

Günlük üretim akışı (her sabah gündemden 3 konu, onay, üretim): [GUNLUK.md](GUNLUK.md)

## Kurulum

```bash
cd cop-adam
npm install
npx playwright install chromium   # ilk seferde, tarayıcıyı indirir
```

`ffmpeg` sistemde kurulu olmalı.

## Video üretme

```bash
node render.mjs atlama                       # -> out/atlama.mp4
node render.mjs kazi --watermark @hesabin    # ortada soluk filigran
node render.mjs atlama --sessiz              # ses efektleri olmadan
node render.mjs atlama --stills 0,3.2,8      # sadece o saniyelerden PNG kareler
node render.mjs atlama --ses                 # videoyu tekrar render etmeden sadece sesi yeniden karıştırır
node render.mjs profil --size 1080x1080 --stills 0   # profil resmi (kare)
```

Render ekran kartıyla yapılır; 11 saniyelik bir sahne GTX 1050 Ti'de yaklaşık 1 dakika sürer. Ekran kartı yoksa ya da görüntü bozuk çıkarsa `--cpu` ile yazılımsal grafiğe geçilir (yavaş, sahne başına birkaç dakika). `--jobs 2` kareleri birden fazla sekmede çizer; hızlı CPU'larda işe yarayabilir.

## Tarayıcıda canlı izleme

```bash
node serve.mjs 8080
# http://localhost:8080/?scene=atlama
# http://localhost:8080/?scene=kazi&t=6.7   (belli bir anda dondurur)
```

## Yeni sahne ekleme

`src/scenes/<isim>.js` dosyası bir `build(world)` fonksiyonu döndürür. Kullanılabilecek parçalar:

- `StickFigure`: çöp adam iskeleti. Pozlar eklem açılarıyla verilir, eller ve ayaklar IK ile bir noktaya uzatılabilir, ele alet takılabilir (`attach`).
- `Track`: arka arkaya klipler. Her klip bir önceki klibin bittiği yerden yumuşakça devam eder.
- `poses.js` / `moves.js`: yürüme, koşma, dalış, çömelme, titreme ve nefes gibi hazır hareketler.
- `world`: kamera, su yansıması, sıçrama ve toz parçacıkları, etiketler (`addLabel`), düşünce yazıları (`addThought`), kapanış yazısı (`setCaption`).
- `audio.mjs`: sahnenin döndürdüğü `sfx` listesindeki sesler (sıçrama, tahta, kazma, çınlama...).

Yazı tipi: [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), SIL Open Font License (`fonts/OFL.txt`).
