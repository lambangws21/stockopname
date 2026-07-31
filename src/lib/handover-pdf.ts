import type { OnlineHandover } from "@/types/handover";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(date);
}

export async function printHandoverDocument(
  handover: OnlineHandover,
  verificationUrl: string
) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) throw new Error("Izinkan pop-up untuk mencetak dokumen");

  const { toDataURL } = await import("qrcode");
  const qr = await toDataURL(verificationUrl, {
    margin: 1,
    width: 180,
    errorCorrectionLevel: "M",
  });
  const items = handover.Items.filter(
    (item) => item.selected && Number(item.qtyIssued || 0) > 0
  );
  const rows = items
    .map(
      (item, index) => `<tr>
        <td>${index + 1}</td><td>${escapeHtml(item.partNumber)}</td>
        <td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.batch || "-")}</td>
        <td class="center">${Number(item.qtyIssued || 0)}</td>
        <td>${escapeHtml(item.locationStatus || "Baik")}</td>
      </tr>`
    )
    .join("");
  const status =
    handover.Status === "DITERIMA"
      ? "SELESAI"
      : handover.Status === "DIKIRIM"
        ? "MENUNGGU TANDA TANGAN"
        : "DRAFT";

  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Berita Acara ${escapeHtml(handover.ID)}</title>
    <style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;margin:0}
      header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #172033;padding-bottom:12px}
      h1{font-size:20px;margin:4px 0}.muted{color:#667085}.badge{display:inline-block;padding:5px 10px;border:1px solid #172033;border-radius:999px;font-size:10px;font-weight:700}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 30px;margin:18px 0}.meta b{display:inline-block;width:105px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cdd5df;padding:7px;text-align:left}th{background:#eef2f7;font-size:10px;text-transform:uppercase}.center{text-align:center}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}.signature{text-align:center}.signature img{height:80px;max-width:230px;object-fit:contain}.line{border-top:1px solid #172033;margin:4px auto;width:75%}
      .audit{font-size:9px;color:#667085;line-height:1.45}.verify{display:flex;align-items:center;gap:10px;margin-top:26px;border-top:1px solid #cdd5df;padding-top:12px}.verify img{width:74px;height:74px}
      @media print{button{display:none}}
    </style></head><body>
    <header><div><div class="muted">IMPLANT INVENTORY</div><h1>BERITA ACARA SERAH TERIMA</h1><b>${escapeHtml(handover.ID || "-")}</b></div>
      <div style="text-align:right"><span class="badge">${status}</span><p>${dateTime(handover.UpdatedAt)}</p></div></header>
    <section class="meta">
      <div><b>Rumah Sakit</b>: ${escapeHtml(handover.Hospital || "-")}</div>
      <div><b>Tindakan</b>: ${escapeHtml(handover.Procedure)}</div>
      <div><b>Dokter</b>: ${escapeHtml(handover.Surgeon || "-")}</div>
      <div><b>Brand</b>: ${escapeHtml(handover.Brand)}</div>
      <div><b>Tanggal</b>: ${escapeHtml(handover.HandoverDate || "-")}</div>
      <div><b>Set / Box</b>: ${escapeHtml(handover.SetName || "-")}</div>
    </section>
    <table><thead><tr><th>No</th><th>REF</th><th>Deskripsi</th><th>Batch</th><th>Qty</th><th>Kondisi</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="center">Tidak ada item</td></tr>'}</tbody></table>
    <section class="signatures">
      <div class="signature"><b>Yang Menyerahkan</b><div>${handover.SenderSignature ? `<img src="${handover.SenderSignature}">` : "<div style='height:84px'></div>"}</div>
        <div class="line"></div><b>${escapeHtml(handover.Sender || "-")}</b>
        <p class="audit">Ditandatangani: ${dateTime(handover.SenderSignatureMeta?.signedAt)}</p></div>
      <div class="signature"><b>Yang Menerima</b><div>${handover.ReceiverSignature ? `<img src="${handover.ReceiverSignature}">` : "<div style='height:84px'></div>"}</div>
        <div class="line"></div><b>${escapeHtml(handover.Receiver || "-")}</b>
        <p class="audit">Ditandatangani: ${dateTime(handover.ReceiverSignatureMeta?.signedAt)}</p></div>
    </section>
    <section class="verify"><img src="${qr}"><div><b>Verifikasi dokumen</b><p class="audit">Pindai QR untuk membuka dokumen online.<br>${escapeHtml(verificationUrl)}</p></div></section>
    <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350))</script>
    </body></html>`);
  printWindow.document.close();
}
