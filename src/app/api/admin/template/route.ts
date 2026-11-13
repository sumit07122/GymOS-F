import { NextResponse } from "next/server";
import { getImportTemplateCsv } from "@/server/admin/import";
import { requirePlatformAdmin } from "@/server/auth/guards";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const csvContent = getImportTemplateCsv();

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="gymos_member_import_template.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

