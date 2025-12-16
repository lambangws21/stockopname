"use client";
import { Button } from "@/components/ui/button";
import  { useState } from "react";

export default function ShakeTest() {
  const [open, setOpen] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  
  const toggle = () => {
    setOpen((v) => !v);
    setAnimKey((k) => k + 1); // 🔑 retrigger animation
  };
  

  return (
    <div className="flex justify-center mt-20">
      <div className="animate-shake-infinite bg-red-600 text-white px-8 py-4 text-lg rounded-xl">
        ⚠️ ERROR SHAKE
      </div>
      <div className="animate-invalid bg-red-600 text-white px-8 py-4 text-lg rounded-xl">
        ⚠️ ERROR SHAKE
      </div>

      <Button className="animate-flame bg-orange-600 text-white">Urgent</Button>

      <button onClick={toggle} className="mb-4">
  Toggle Box
</button>

{open && (
  <div
    key={animKey}
    className="animate-box-open rounded-xl border p-4 bg-white dark:bg-zinc-900"
  >
    📦 Box Open Content
  </div>
)}


    </div>
  );
}
