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
  verificationUrl: string,
  existingWindow?: Window | null
) {
  const printWindow = existingWindow || window.open("", "_blank");
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
  const implantRows = items
    .map(
      (item, index) => {
        const used = Number(item.usedQty || 0);
        const returned = Number(item.returnedQty || 0);
        const itemStatus = used > 0
          ? `<span class="item-status used">TERPAKAI ${used}</span>`
          : returned > 0
            ? `<span class="item-status returned">KEMBALI ${returned}</span>`
            : `<span class="item-status active">${escapeHtml(item.locationStatus || "DIKIRIM")}</span>`;
        return `<tr class="${used > 0 ? "used-row" : returned > 0 ? "returned-row" : ""}">
        <td>${index + 1}</td><td>${escapeHtml(item.partNumber)}</td>
        <td>${escapeHtml(item.description)}</td><td>${escapeHtml(item.batch || "-")}</td>
        <td class="center">${Number(item.qtyIssued || 0)}</td>
        <td>${itemStatus}</td>
      </tr>`;
      }
    )
    .join("");
  const instruments = handover.Instruments.filter(
    (instrument) => instrument.selected && Number(instrument.qty || 0) > 0
  );
  const instrumentRows = instruments
    .map(
      (instrument, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(instrument.code || "-")}</td>
        <td>${escapeHtml(instrument.name || "-")}</td>
        <td class="center">${Number(instrument.qty || 0)} ${escapeHtml(instrument.unit || "PC")}</td>
        <td>${escapeHtml(instrument.condition || "-")}</td>
        <td>${escapeHtml(instrument.supplySource || "OFFICE")}</td>
        <td>${escapeHtml(instrument.note || "-")}</td>
      </tr>`
    )
    .join("");
  const status =
    handover.Status === "DITERIMA"
      ? "SELESAI"
      : handover.Status === "DIKIRIM"
        ? "MENUNGGU TANDA TANGAN"
        : "DRAFT";

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Berita Acara ${escapeHtml(handover.Hospital || "Serah Terima")}</title>
    <style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;margin:0}
      header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #172033;padding-bottom:12px}
      h1{font-size:20px;margin:4px 0}.muted{color:#667085}.badge{display:inline-block;padding:5px 10px;border:1px solid #172033;border-radius:999px;font-size:10px;font-weight:700}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 30px;margin:18px 0}.meta b{display:inline-block;width:105px}
      h2{font-size:13px;margin:20px 0 6px;padding:7px 9px;background:#172033;color:#fff;border-radius:5px}.section-count{float:right;font-size:9px;font-weight:400}
      table{width:100%;border-collapse:collapse;margin-top:6px;page-break-inside:auto}tr{page-break-inside:avoid}th,td{border:1px solid #cdd5df;padding:7px;text-align:left}th{background:#eef2f7;font-size:9px;text-transform:uppercase}.center{text-align:center}
      .used-row{background:#fff1f2}.returned-row{background:#ecfdf5}.item-status{display:inline-block;border-radius:999px;padding:3px 6px;font-size:8px;font-weight:700}.item-status.used{background:#e11d48;color:#fff}.item-status.returned{background:#059669;color:#fff}.item-status.active{background:#dbeafe;color:#1d4ed8}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}.signature{text-align:center}.signature img{height:80px;max-width:230px;object-fit:contain}.line{border-top:1px solid #172033;margin:4px auto;width:75%}
      .audit{font-size:9px;color:#667085;line-height:1.45}.verify{display:flex;align-items:center;gap:10px;margin-top:26px;border-top:1px solid #cdd5df;padding-top:12px}.verify img{width:74px;height:74px}
      @media print{button{display:none}}
    </style></head><body>
    <header><div><div class="muted">IMPLANT INVENTORY</div><h1>BERITA ACARA SERAH TERIMA</h1><b>${escapeHtml(handover.Hospital || "-")} · ${escapeHtml(handover.Procedure)}</b></div>
      <div style="text-align:right"><span class="badge">${status}</span><p>${dateTime(handover.UpdatedAt)}</p></div></header>
    <section class="meta">
      <div><b>Rumah Sakit</b>: ${escapeHtml(handover.Hospital || "-")}</div>
      <div><b>Tindakan</b>: ${escapeHtml(handover.Procedure)}</div>
      <div><b>Dokter</b>: ${escapeHtml(handover.Surgeon || "-")}</div>
      <div><b>Brand</b>: ${escapeHtml(handover.Brand)}</div>
      <div><b>Bearing</b>: ${escapeHtml(handover.BearingOption || "-")}</div>
      <div><b>Tanggal</b>: ${escapeHtml(handover.HandoverDate || "-")}</div>
      <div><b>Set / Box</b>: ${escapeHtml(handover.SetName || "-")}</div>
    </section>
    <h2>DAFTAR IMPLANT <span class="section-count">${items.length} item</span></h2>
    <table><thead><tr><th>No</th><th>REF</th><th>Deskripsi Implant</th><th>LOT / Batch</th><th>Qty</th><th>Status</th></tr></thead><tbody>${implantRows || '<tr><td colspan="6" class="center">Tidak ada implant dipilih</td></tr>'}</tbody></table>
    <h2>DAFTAR INSTRUMEN <span class="section-count">${instruments.length} item</span></h2>
    <table><thead><tr><th>No</th><th>Kode</th><th>Nama Instrumen</th><th>Jumlah</th><th>Kondisi</th><th>Sumber</th><th>Keterangan</th></tr></thead><tbody>${instrumentRows || '<tr><td colspan="7" class="center">Tidak ada instrumen dipilih</td></tr>'}</tbody></table>
    <section class="signatures">
      <div class="signature"><b>Yang Menyerahkan</b><div>${handover.SenderSignature ? `<img src="${handover.SenderSignature}">` : "<div style='height:84px'></div>"}</div>
        <div class="line"></div><b>${escapeHtml(handover.Sender || "-")}</b>
        <p class="audit">Ditandatangani: ${dateTime(handover.SenderSignatureMeta?.signedAt)}</p></div>
      <div class="signature"><b>Yang Menerima</b><div>${handover.ReceiverSignature ? `<img src="${handover.ReceiverSignature}">` : "<div style='height:84px'></div>"}</div>
        <div class="line"></div><b>${escapeHtml(handover.Receiver || "-")}</b>
        <p class="audit">Ditandatangani: ${dateTime(handover.ReceiverSignatureMeta?.signedAt)}</p></div>
    </section>
    <section class="verify"><img src="${qr}"><div><b>Verifikasi dokumen</b><p class="audit">Pindai QR untuk membuka dokumen ini saja.</p></div></section>
    <script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350))</script>
    </body></html>`);
  printWindow.document.close();
}
