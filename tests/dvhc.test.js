import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildIndex, searchOld, searchNew, queryWords } from "../assets/lib/dvhc.js";

const D = JSON.parse(readFileSync(new URL("../data/don-vi-hanh-chinh.json", import.meta.url)));
const I = buildIndex(D);
const newName = (o, i = 0) => I.ward.get(o.to[i]).name;

test("dữ liệu đủ 34 tỉnh, mọi xã cũ đều trỏ tới xã mới có thật", () => {
  assert.equal(I.prov.size, 34);
  assert.ok(I.wards.length > 3000);
  for (const o of I.old) for (const c of o.to) assert.ok(I.ward.has(c), o.code);
  for (const t of ["title", "updated", "source"]) assert.ok(D[t], t);
});

test("viết tắt trong truy vấn", () => {
  assert.deepEqual(queryWords("P.5, Q3, TP HCM"), ["p", "5", "q", "3", "ho", "chi", "minh"]);
});

test("tìm xã/phường cũ", () => {
  const a = searchOld(I, "phường Bến Nghé quận 1");
  assert.equal(a[0].name, "Bến Nghé");
  assert.equal(newName(a[0]), "Sài Gòn");
  const b = searchOld(I, "p5 q3 hcm");
  assert.equal(b[0].name, "5");
  assert.equal(b[0].dist.name, "3");
  assert.equal(searchOld(I, "phường 5 quận 3").filter((o) => o.name === "15").length, 0);
  const c = searchOld(I, "trúc bạch");
  assert.equal(newName(c[0]), "Ba Đình");
});

test("tìm xã/phường mới và nguồn gốc", () => {
  const w = searchNew(I, "phường Sài Gòn")[0];
  assert.equal(w.provObj.name, "Hồ Chí Minh");
  assert.ok(w.origins.some((x) => x.old.name === "Bến Nghé"));
  assert.ok(searchNew(I, "ba dinh", { prov: "01" }).every((x) => x.prov === "01"));
});
