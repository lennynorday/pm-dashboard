import { NextResponse } from "next/server";
import { exportAccountGegevens } from "@/lib/accountgegevens";
import { currentUser } from "@/lib/session";

/** Alle accountgegevens als JSON-bestand: een back-up, of om te verhuizen. */
export async function GET(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const datum = new Date().toISOString().slice(0, 10);
  return new NextResponse(
    JSON.stringify(exportAccountGegevens(), null, 2) + "\n",
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pm-dashboard-accountgegevens-${datum}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
