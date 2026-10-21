#!/usr/bin/env node
/* File mẫu cho nhóm Bảo mật (không cần Chrome):
   bao-cao-mat-khau-1234.pdf.bbe  – bao-cao-quy-1.pdf mã hoá bằng mật khẩu 1234 (Mã hoá/giải mã file)
   bao-cao-quy-1.pdf.sha256       – mã SHA-256 của bao-cao-quy-1.pdf theo định dạng sha256sum (Tính checksum file)
   Chạy:  node scripts/samples/bao-mat.js   (cần samples/bao-cao-quy-1.pdf) */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { encryptBlob } from "../../assets/lib/ma-hoa.js";

const OUT = fileURLToPath(new URL("../../samples/", import.meta.url));

export async function makeSecuritySamples() {
  const pdf = readFileSync(OUT + "bao-cao-quy-1.pdf");
  const enc = await encryptBlob(new Blob([pdf]), "1234", { name: "bao-cao-quy-1.pdf", type: "application/pdf" });
  writeFileSync(OUT + "bao-cao-mat-khau-1234.pdf.bbe", Buffer.from(await enc.arrayBuffer()));
  writeFileSync(OUT + "bao-cao-quy-1.pdf.sha256", createHash("sha256").update(pdf).digest("hex") + "  bao-cao-quy-1.pdf\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await makeSecuritySamples();
