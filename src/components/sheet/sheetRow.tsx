"use client";

import { PriceItem } from "@/types/priceItem";

export function PriceRow({ item }: { item: PriceItem }) {
return ( <tr className="border-b hover:bg-gray-50 transition-colors"> <td className="p-2">{item.no}</td> <td className="p-2">{item.system}</td> <td className="p-2">{item.product}</td> <td className="p-2">{item.type}</td> <td className="p-2">{item.qty}</td> <td className="p-2">{item.hargaNett.toLocaleString("id-ID")}</td> <td className="p-2">{item.hargaNettPPN.toLocaleString("id-ID")}</td> </tr>
);
}
