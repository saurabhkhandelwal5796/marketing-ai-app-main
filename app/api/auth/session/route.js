import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
