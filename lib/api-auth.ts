import { NextResponse } from "next/server";

export function requireApiKey(request: Request): NextResponse | null {
  const expected = process.env.PUBLIC_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "PUBLIC_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }
  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
