import { NextResponse } from "next/server";
import { requireGym } from "@/server/auth/guards";
import { generateDynamicReceptionQr } from "@/server/gyms/attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await requireGym({ roles: ["OWNER"], access: "operational" });
    const qrData = generateDynamicReceptionQr(me.gymId);
    return NextResponse.json(qrData);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
