import { NextResponse } from "next/server";
import { requireGym } from "@/server/auth/guards";
import { generateMemberPassQr } from "@/server/gyms/attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await requireGym({ roles: ["MEMBER"], access: "operational" });
    const qrData = generateMemberPassQr(me.gymId, me.userId);
    return NextResponse.json(qrData);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
