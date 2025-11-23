import neo4j from "neo4j-driver";

// Minimal configuration — override with environment variables
const URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const USER = process.env.NEO4J_USER || "neo4j";
const PASS = process.env.NEO4J_PASSWORD || "password";

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS));

export function getSession() {
	return driver.session();
}

// optional helper to close the driver
export async function closeDriver() {
	await driver.close();
}
