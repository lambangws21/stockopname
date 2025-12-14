"use client";

import { StepCard } from "./StepCard";
import { Users, Mail, Star } from "lucide-react";
import { useSheetStore } from "@/components/sheet/useSheetStore";

export default function StepList() {
  const { fetchData, openAddModal } = useSheetStore();

  const handleStep = (step: string) => {
    if (step === "01") openAddModal();  // contoh sambungkan modal
    if (step === "02") fetchData();      // contoh sambungkan fetch handler
    if (step === "03") alert("Step 3 triggered!");
  };

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <StepCard
        number="01"
        title="BUSINESS PLAN"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        icon={<Users size={40} />}
        color="bg-blue-600"
        onClickStep={() => handleStep("01")}
      />

      <StepCard
        number="02"
        title="BUSINESS PLAN"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        icon={<Mail size={40} />}
        color="bg-purple-600"
        onClickStep={() => handleStep("02")}
      />

      <StepCard
        number="03"
        title="BUSINESS PLAN"
        description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        icon={<Star size={40} />}
        color="bg-orange-600"
        onClickStep={() => handleStep("03")}
      />
    </div>
  );
}
