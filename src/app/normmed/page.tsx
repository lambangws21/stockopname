import type { Metadata } from "next";
import NormmedLandingPage from "@/components/NormmedLandingPage";

export const metadata: Metadata = {
  title: "Ortho Bali | Normmed & Zimmer Biomet",
  description:
    "Portfolio implant hip, total knee, dan partial knee Normmed serta Zimmer Biomet untuk wilayah Bali Indonesia.",
};

export default function NormmedPage() {
  return <NormmedLandingPage />;
}
