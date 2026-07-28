import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import admin from "@/lib/firebase/admin";
import {
  ImplantStockItem,
  ImplantedFirestoreStock,
  StockAction,
} from "@/types/implant-stock";
import {
  IMPLANT_BRANDS,
  IMPLANT_PROCEDURES,
  inferImplantClassification,
} from "@/lib/implantCatalog";

interface CreateStockPayload {
  stockNo?: string;
  description?: string;
  batch?: string;
  qty?: number;
  refill?: number;
  used?: number;
  note?: string;
  procedure?: string;
  brand?: string;
  component?: string;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "implantStocks"));

    const data: ImplantStockItem[] = [];

    snapshot.docs.forEach((doc) => {
      const raw = doc.data() as ImplantedFirestoreStock;
      const inferred = inferImplantClassification(
        raw.procedure,
        raw.brand,
        raw.deskripsi,
        raw.noStok,
        raw.keterangan
      );

      // ✅ Skip data yang di soft delete
      if (raw.isDeleted === true) return;

      data.push({
        id: doc.id,

        // ✅ WAJIB ADA
        no: Number(raw.no ?? 0),

        stockNo: String(raw.noStok ?? ""),
        description: String(raw.deskripsi ?? ""),
        batch: String(raw.batch ?? ""),
        qty: Number(raw.qty ?? 0),
        refill: Number(raw.refill ?? 0),
        used: Number(raw.terpakai ?? 0),
        totalQty: Number(raw.totalQty ?? 0),
        note: String(raw.keterangan ?? ""),
        procedure: raw.procedure ?? inferred.procedure,
        brand: raw.brand ?? inferred.brand,
        component: String(raw.component ?? ""),
        createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
        updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
      });
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStocks error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateStockPayload;

    const stockNo = String(body.stockNo ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!stockNo) {
      return NextResponse.json(
        { error: "No stok wajib diisi" },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Deskripsi wajib diisi" },
        { status: 400 }
      );
    }

    const qty = toSafeNumber(body.qty);
    const refill = toSafeNumber(body.refill);
    const used = toSafeNumber(body.used);
    const totalQty = qty + refill - used;
    const procedure = IMPLANT_PROCEDURES.includes(
      body.procedure as (typeof IMPLANT_PROCEDURES)[number]
    )
      ? (body.procedure as ImplantedFirestoreStock["procedure"])
      : undefined;
    const brand = IMPLANT_BRANDS.includes(
      body.brand as (typeof IMPLANT_BRANDS)[number]
    )
      ? (body.brand as ImplantedFirestoreStock["brand"])
      : undefined;

    const firestore = admin.firestore();
    const stocksRef = firestore.collection("implantStocks");

    const lastNoSnapshot = await stocksRef.orderBy("no", "desc").limit(1).get();
    const nextNo = lastNoSnapshot.empty
      ? 1
      : toSafeNumber(lastNoSnapshot.docs[0].data().no, 0) + 1;

    const now = new Date();
    const stockData: ImplantedFirestoreStock = {
      no: nextNo,
      noStok: stockNo,
      deskripsi: description,
      batch: String(body.batch ?? "").trim(),
      qty,
      refill,
      terpakai: used,
      totalQty,
      keterangan: String(body.note ?? "").trim(),
      procedure,
      brand,
      component: String(body.component ?? "").trim(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const stockRef = stocksRef.doc();
    const logRef = firestore.collection("implantStockLogs").doc();
    const batch = firestore.batch();

    batch.set(stockRef, stockData);
    batch.set(logRef, {
      stockId: stockRef.id,
      action: "CREATE" as StockAction,
      before: null,
      after: stockData,
      changedAt: now,
      source: "qr-scan",
    });

    await batch.commit();

    return NextResponse.json(
      {
        id: stockRef.id,
        no: nextNo,
        totalQty,
        message: "Stok implant berhasil ditambahkan",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST implantStocks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
