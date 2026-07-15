import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return NextResponse.json({ message: "File ID foto tidak valid" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`,
      { cache: "no-store", redirect: "follow" }
    );
    if (!response.ok || !response.body) {
      return NextResponse.json({ message: "Foto tidak dapat diakses" }, { status: 404 });
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ message: "Respons Drive bukan gambar" }, { status: 502 });
    }
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ message: "Gagal mengambil foto dari Google Drive" }, { status: 502 });
  }
}
