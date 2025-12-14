// import { NextRequest, NextResponse } from "next/server";
// import { collection, addDoc } from "firebase/firestore";
// import { db } from "@/lib/firebase/client";
// import { ImplantStockItem } from "@/types/implant-stock";

// export async function POST(req: NextRequest) {
//   try {
//     const data: ImplantStockItem[] = await req.json();

//     const colRef = collection(db, "implantStocks");

//     for (const item of data) {
//       await addDoc(colRef, {
//         no: item.no,
//         implant: item.implant,
//         stockNumber: item.stockNumber,
//         batchNumber: item.batchNumber,
//         qty: item.qty,
//         note: item.note,
//         createdAt: item.createdAt,
//       });
//     }

//     return NextResponse.json({
//       status: "success",
//       totalInserted: data.length,
//     });
//   } catch  {
//     return NextResponse.json(
//       { error: "Gagal menyimpan ke Firebase" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ImplantStockItemBase } from "@/types/implant-stock";

export async function POST(req: NextRequest) {
  try {
    const data: ImplantStockItemBase[] = await req.json();

    const colRef = collection(db, "implantStocks");

    for (const item of data) {
      await addDoc(colRef, {
        ...item,
      });
    }

    return NextResponse.json({
      status: "success",
      totalInserted: data.length,
    });
  } catch  {
    return NextResponse.json(
      { error: "Gagal menyimpan ke Firestore" },
      { status: 500 }
    );
  }
}
