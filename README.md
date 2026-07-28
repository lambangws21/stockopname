# NEX Stock Implant

Aplikasi manajemen stok implant dan customer mapping berbasis Next.js,
Google Sheets, dan Google Apps Script.

## Google Apps Script

Seluruh backend Google Sheets berada dalam satu file:

[`docs/appscript.gs`](docs/appscript.gs)

File tersebut menangani:

- CRUD, mutasi, duplikasi, dan histori stok;
- klasifikasi implant dan brand;
- scanner lookup, KPI, serta sinkronisasi total stok;
- import external sheet;
- backup dan export PDF;
- Customer Mapping dan Customer Usage History.

Untuk deployment:

1. Salin seluruh isi `docs/appscript.gs` ke project Google Apps Script.
2. Pilih **Deploy → Manage deployments → Edit**.
3. Buat versi baru dan deploy sebagai Web App.
4. Pastikan URL deployment yang digunakan pada environment aplikasi adalah URL terbaru.

Endpoint `GET ?action=capabilities` dapat digunakan untuk memeriksa versi dan
fitur Apps Script yang sedang aktif.

Semua sheet dan header dibuat otomatis setiap kali spreadsheet dibuka:
`Sheet1`, `History`, `CustomerMapping`, `CustomerHistory`, dan
`CustomerUsageHistory`. Menu **NEX Stock → Siapkan Semua Sheet & Header** atau
endpoint `GET ?action=setupSheet` dapat digunakan untuk menjalankannya secara
manual.

### Logika pergerakan stok

- `Qty` adalah stok aktual dan `TotalQty` selalu mengikuti `Qty`.
- Refill menambah `Qty` dan akumulasi `REFILL`.
- Terpakai operasi mengurangi `Qty` dan menambah akumulasi `TERPAKAI`.
- Mobilisasi keluar mengurangi `Qty` tanpa menambah `TERPAKAI`.
- Mobilisasi masuk menambah `Qty` tanpa menambah `REFILL`.
- Setiap pergerakan wajib memiliki keterangan dan otomatis dicatat pada `KET`
  serta sheet `History`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
