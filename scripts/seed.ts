// scripts/seed.ts
// ... (imports lainnya)
import 'dotenv/config';

// Tambahkan ini untuk mengganti __dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); 
// Sekarang __dirname sudah terdefinisi lagi, tapi menggunakan cara ES Module

// ... (lanjutkan ke konfigurasi driver)
import fs from 'fs';
import csv from 'csv-parser';
import neo4j from 'neo4j-driver';
import 'dotenv/config';
import path from 'path';

// 1. Konfigurasi Driver (Ambil dari .env.local)
// Karena script ini jalan di luar Next.js, kita hardcode fallback-nya atau pastikan dotenv jalan
const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const USER = process.env.NEO4J_USER || 'neo4j';
const PASS = process.env.NEO4J_PASSWORD || 'kelompok123';

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS));

// 2. Fungsi Normalisasi Nama
// Tujuan: menyatukan varian nama seperti "AACHEN, Hans von" dan "Hans von Aachen"
// menjadi bentuk Title Case "Hans Von Aachen" untuk dipakai sebagai MERGE key.
const normalizeName = (rawName: string) => {
  if (!rawName) return '';

  // Bersihkan whitespace, kutip, dan normalisasi unicode
  let name = String(rawName).trim();
  name = name.replace(/^"|"$/g, ''); // buang kutip di sekitar
  name = name.replace(/\s+/g, ' ');
  name = name.normalize('NFKC');

  // Jika format "LAST, First..." (ada koma), ambil bagian setelah koma sebagai first name
  if (name.includes(',')) {
    const parts = name.split(',');
    const last = parts[0].trim();
    const first = parts.slice(1).join(',').trim();
    name = `${first} ${last}`;
  }

  // Hapus karakter non-alfanumerik ekstrim di ujung (mis. titik ganda)
  name = name.replace(/[\s,-]+$/g, '').trim();

  // Title Case sederhana untuk setiap kata
  return formatTitleCase(name);
};

// Helper bikin Huruf Besar Awal (Title Case)
const formatTitleCase = (str: string) => {
  return str
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      // Tangani kasus apostrof atau nama seperti "dell'" dengan baik
      return word
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('-');
    })
    .join(' ');
};

async function main() {
  const session = driver.session();
  console.log("🚀 Memulai Import Data...");

  try {
    // STEP A: Bersihkan Database Lama (Opsional, biar gak duplikat saat testing)
    await session.run('MATCH (n) DETACH DELETE n');
    console.log("🧹 Database lama dibersihkan.");

    // STEP B: Import artists.csv (Dataset "Best Artworks")
    // Ini punya BIO yang penting untuk embedding nanti
    const artistsStream = fs.createReadStream(path.join(__dirname, '..', 'data', 'artists.csv')).pipe(csv());

    for await (const row of artistsStream) {
      // row keys: id, name, years, genre, nationality, bio, wikipedia, paintings
      const cleanName = normalizeName(row.name);

      await session.run(`
        MERGE (a:Artist {name: $name})
        SET a.bio = $bio,
            a.years = $years,
            a.wikipedia = $wikipedia,
            a.source = coalesce(a.source, 'BestArtworks')
      `, {
        name: cleanName,
        bio: row.bio,
        years: row.years,
        wikipedia: row.wikipedia
      });
    }
    console.log("✅ Data 'artists.csv' selesai.");

    // STEP C: Import info_dataset.csv (Dataset "Historic Art")
    // Ini punya Period, School, dan Nationality tambahan
    const infoStream = fs.createReadStream(path.join(__dirname, '..', 'data', 'info_dataset.csv')).pipe(csv());    
    for await (const row of infoStream) {
      // row keys: artist, born-died, period, school, url, base, nationality
      const cleanName = normalizeName(row.artist);

      // Kita MERGE (cari kalau ada, buat kalau belum)
      // Tambahkan nationality jika belum ada (jangan timpa data existing tanpa alasan)
      await session.run(`
        MERGE (a:Artist {name: $name})
        SET a.born_died_str = coalesce(a.born_died_str, $bornDied),
            a.school = coalesce(a.school, $school),
            a.wga_url = coalesce(a.wga_url, $url),
            a.nationality = coalesce(a.nationality, $nationality)

        // Buat Node Movement (Aliran Seni) dan hubungkan
        MERGE (m:Movement {name: $period})
        MERGE (a)-[:BELONGS_TO]->(m)
      `, {
        name: cleanName,
        bornDied: row['born-died'],
        school: row.school,
        url: row.url,
        period: row.period,
        nationality: row.nationality
      });
    }
    console.log("✅ Data 'info_dataset.csv' selesai.");

    // STEP D: Import artwork_dataset.csv (Dataset "Historic Art")
    // Ini berisi karya seni
    const artworkStream = fs.createReadStream(path.join(__dirname, '..', 'data', 'artwork_dataset.csv')).pipe(csv());    
    let count = 0;
    for await (const row of artworkStream) {
      // row keys: ID, artist, title, picture data, file info, jpg url
      const cleanArtistName = normalizeName(row.artist);
      
      // Parse "picture data" yang isinya "year, medium, dimension, museum"
      // Contoh: "1574-88, oil on canvas, 68 x 95 cm, fogg art museum..."
      // Sederhana saja, kita simpan mentahnya dulu.
      
      await session.run(`
        MERGE (a:Artist {name: $artistName})
        MERGE (w:Artwork {id: $id})
        SET w.title = $title,
            w.meta_data = $picData,
            w.url = $jpgUrl,
            w.file_info = $fileInfo
        MERGE (a)-[:CREATED]->(w)
      `, {
        artistName: cleanArtistName,
        id: row.ID,
        title: row.title,
        picData: row['picture data'],
        jpgUrl: row['jpg url'],
        fileInfo: row['file info']
      });
      
      count++;
      if (count % 100 === 0) console.log(`   ...memproses ${count} artwork`);
    }
    console.log(`✅ Data 'artwork_dataset.csv' selesai (${count} artworks).`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await session.close();
    await driver.close();
    console.log("🏁 Selesai.");
  }
}

main();