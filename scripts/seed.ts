import fs from "node:fs";
import csv from "csv-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import neo4j from "neo4j-driver";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Name Normalization Function
const normalizeName = (rawName: string) => {
	if (!rawName) return "";

	let name = String(rawName).trim();
	name = name.replace(/^"|"$/g, "");
	name = name.replace(/\s+/g, " ");
	name = name.normalize("NFKC");

	if (name.includes(",")) {
		const parts = name.split(",");
		const last = parts[0].trim();
		const first = parts.slice(1).join(",").trim();
		name = `${first} ${last}`;
	}

	name = name.replace(/[\s,-]+$/g, "").trim();

	return formatTitleCase(name);
};

// Helper to create Title Case
const formatTitleCase = (str: string) => {
	return str
		.split(" ")
		.filter(Boolean)
		.map((word) => {
			return word
				.split("-")
				.map(
					(part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
				)
				.join("-");
		})
		.join(" ");
};

async function main() {
	const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
	const user = process.env.NEO4J_USER || "neo4j";
	const pass = process.env.NEO4J_PASSWORD || "password";
	const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
	const session = driver.session();
	console.log("🚀 Starting Data Import...");
	console.log(`URI: ${uri}`);
	console.log(`User: ${user}`);
	console.log(`Password: ${pass}`);

	try {
		// STEP A: Clean Old Database
		await session.run("MATCH (n) DETACH DELETE n");
		console.log("🧹 Old database cleaned.");

		// STEP B: Import artists.csv
		const artistsPath = path.join(__dirname, "..", "data", "artists.csv");
		if (fs.existsSync(artistsPath)) {
			const artistsStream = fs.createReadStream(artistsPath).pipe(csv());

			for await (const row of artistsStream) {
				const cleanName = normalizeName(row.name);

				await session.run(
					`
            MERGE (a:Artist {name: $name})
            SET a.bio = $bio,
                a.years = $years,
                a.wikipedia = $wikipedia,
                a.source = coalesce(a.source, 'BestArtworks')
        `,
					{
						name: cleanName,
						bio: row.bio,
						years: row.years,
						wikipedia: row.wikipedia,
					},
				);
			}
			console.log("✅ Data 'artists.csv' finished.");
		} else {
			console.warn("⚠️ File 'artists.csv' not found.");
		}

		// STEP C: Import info_dataset.csv
		const infoPath = path.join(__dirname, "..", "data", "info_dataset.csv");
		if (fs.existsSync(infoPath)) {
			const infoStream = fs.createReadStream(infoPath).pipe(csv());
			for await (const row of infoStream) {
				const cleanName = normalizeName(row.artist);

				await session.run(
					`
            MERGE (a:Artist {name: $name})
            SET a.born_died_str = coalesce(a.born_died_str, $bornDied),
                a.school = coalesce(a.school, $school),
                a.wga_url = coalesce(a.wga_url, $url),
                a.nationality = coalesce(a.nationality, $nationality)

            MERGE (m:Movement {name: $period})
            MERGE (a)-[:BELONGS_TO]->(m)
        `,
					{
						name: cleanName,
						bornDied: row["born-died"],
						school: row.school,
						url: row.url,
						period: row.period,
						nationality: row.nationality,
					},
				);
			}
			console.log("✅ Data 'info_dataset.csv' finished.");
		} else {
			console.warn("⚠️ File 'info_dataset.csv' not found.");
		}

		// STEP D: Import artwork_dataset.csv
		const artworkPath = path.join(
			__dirname,
			"..",
			"data",
			"artwork_dataset.csv",
		);
		if (fs.existsSync(artworkPath)) {
			const artworkStream = fs.createReadStream(artworkPath).pipe(csv());
			let count = 0;
			for await (const row of artworkStream) {
				const cleanArtistName = normalizeName(row.artist);

				await session.run(
					`
            MERGE (a:Artist {name: $artistName})
            MERGE (w:Artwork {id: $id})
            SET w.title = $title,
                w.meta_data = $picData,
                w.url = $jpgUrl,
                w.file_info = $fileInfo
            MERGE (a)-[:CREATED]->(w)
        `,
					{
						artistName: cleanArtistName,
						id: row.ID,
						title: row.title,
						picData: row["picture data"],
						jpgUrl: row["jpg url"],
						fileInfo: row["file info"],
					},
				);

				count++;
				if (count % 100 === 0) console.log(`   ...processing ${count} artwork`);
			}
			console.log(
				`✅ Data 'artwork_dataset.csv' finished (${count} artworks).`,
			);
		} else {
			console.warn("⚠️ File 'artwork_dataset.csv' not found.");
		}
	} catch (error) {
		console.error("❌ Error:", error);
	} finally {
		await session.close();
		await driver.close();
		console.log("🏁 Finished.");
	}
}

main();
