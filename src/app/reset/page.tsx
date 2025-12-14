"use client";

export function ResetDatabaseButton() {
  const handleReset = async () => {
    const ok = confirm(
      "⚠️ SEMUA DATA AKAN DIHAPUS PERMANEN!\nApakah kamu yakin?"
    );

    if (!ok) return;

    const res = await fetch("/api/reset-database", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: "hapus-semua-data", // ✅ HARUS SAMA DENGAN .env
      }),
    });

    const data = await res.json();

    if (data.status === "success") {
      alert("✅ Database berhasil di-reset:\n" + JSON.stringify(data.deleted));
    } else {
      alert("❌ Gagal reset database");
    }
  };

  return (
    <button
      onClick={handleReset}
      className="bg-red-600 text-white p-5 rounded mx-auto mt-4"
    >
      🔥 Reset Database
    </button>
  );
}

export default ResetDatabaseButton;