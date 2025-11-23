import { NextResponse } from "next/server";
import { executeCypherQuery } from "../../action";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const query = body?.query;

		if (!query || !String(query).trim()) {
			return NextResponse.json(
				{ error: true, message: "Query tidak boleh kosong." },
				{ status: 400 },
			);
		}

		const result = await executeCypherQuery(String(query));
		return NextResponse.json(result);
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		return NextResponse.json(
			{ error: true, message: message },
			{ status: 500 },
		);
	}
}
