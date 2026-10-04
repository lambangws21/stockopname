import type { Metadata } from "next";
import NormmedLandingPage from "@/components/NormmedLandingPage";

export const metadata: Metadata = {
  title: "Normmed Orthopaedic Systems | Hip & Knee",
  description:
    "Mengenal sistem implant hip dan knee Normmed, desain material, lini produk, dan kontak cabang Bali Indonesia.",
};

export default function NormmedPage() {
  return <NormmedLandingPage />;
}
