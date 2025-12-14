import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PriceShareCard() {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border border-blue-200 rounded-xl bg-white">
      <CardHeader className="bg-blue-600 text-white rounded-t-xl">
        <CardTitle className="text-lg font-semibold">Zimmer Biomet – Info Harga Implant</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Jenis Produk</span>
          <Badge className="bg-blue-100 text-blue-700">Knee / THR / Bipolar</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">Harga</span>
          <span className="font-semibold text-blue-600">Hubungi untuk penawaran</span>
        </div>

        <div className="pt-3 border-t">
          <p className="text-sm text-gray-600">
            Termasuk dukungan teknis, pendampingan operasi, dan pengecekan stok real-time.
          </p>
        </div>

        <div className="pt-2 text-sm text-gray-700">
          <p className="font-semibold">Contact:</p>
          <p>Lambang — Zimmer Biomet Technical Support</p>
          <p>📞 WhatsApp: <span className="font-medium">+62xxx</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
