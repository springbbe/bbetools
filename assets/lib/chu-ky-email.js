/* Chữ ký email (hàm thuần): sinh HTML dạng bảng, CSS viết thẳng vào thẻ (inline) để Gmail, Outlook hiển thị giống nhau.
   Ảnh phải là đường link công khai (https://…): Gmail và Outlook chặn ảnh nhúng dạng data:. */

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Chuẩn hoá đường link: thêm https:// khi thiếu; chỉ cho http(s), mailto, tel. Trả về "" nếu không hợp lệ */
export function normUrl(u) {
  let s = String(u ?? "").trim();
  if (!s) return "";
  if (/^(mailto|tel):/i.test(s)) return s;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  if (!/^https?:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(s)) return "";
  return s.replace(/\s/g, "%20");
}
/** Hiển thị link gọn: bỏ https://, www., dấu / cuối */
export const shortUrl = (u) => String(u).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
export const telHref = (p) => "tel:" + String(p).replace(/[^\d+]/g, "");

export const SOCIALS = [
  ["facebook", "Facebook"], ["linkedin", "LinkedIn"], ["zalo", "Zalo"], ["youtube", "YouTube"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["x", "X"]
];

/**
 * d: { name, title, company, phone, phone2, email, website, address, photo (link ảnh), logo, color,
 *      facebook, linkedin, zalo, youtube, tiktok, instagram, x, note (lời nhắn cuối), layout: "left"|"top"|"line", font }
 * → chuỗi HTML
 */
export function signatureHtml(d) {
  const color = /^#[0-9a-f]{6}$/i.test(d.color || "") ? d.color : "#3E5BF2";
  const font = d.font || "Arial, Helvetica, sans-serif";
  const base = `font-family:${font};font-size:14px;line-height:1.45;color:#222222`;
  const muted = "color:#666666";
  const link = (href, text) => `<a href="${esc(href)}" style="color:${color};text-decoration:none">${esc(text)}</a>`;
  const rows = [];
  const contact = [];
  if (d.phone) contact.push(`<span style="${muted}">ĐT:</span> ${link(telHref(d.phone), d.phone)}`);
  if (d.phone2) contact.push(`<span style="${muted}">Hotline:</span> ${link(telHref(d.phone2), d.phone2)}`);
  if (d.email) contact.push(`<span style="${muted}">Email:</span> ${link("mailto:" + String(d.email).trim(), String(d.email).trim())}`);
  const web = normUrl(d.website);
  if (web) contact.push(`<span style="${muted}">Web:</span> ${link(web, shortUrl(web))}`);
  const socials = SOCIALS.map(([k, label]) => [normUrl(d[k]), label]).filter(([u]) => u);
  const photo = normUrl(d.photo), logo = normUrl(d.logo);

  const nameLine = d.name ? `<div style="font-size:17px;font-weight:bold;color:${color}">${esc(d.name)}</div>` : "";
  const titleLine = [d.title, d.company].filter(Boolean).map(esc).join(" · ");
  rows.push(nameLine);
  if (titleLine) rows.push(`<div style="${muted};font-size:13.5px">${titleLine}</div>`);
  const info = [];
  if (contact.length) info.push(contact.map((c) => `<div>${c}</div>`).join(""));
  if (d.address) info.push(`<div><span style="${muted}">Địa chỉ:</span> ${esc(d.address)}</div>`);
  if (socials.length) info.push(`<div style="padding-top:4px">${socials.map(([u, l]) => link(u, l)).join(` <span style="color:#bbbbbb">|</span> `)}</div>`);
  const infoHtml = info.length ? `<div style="font-size:13px;padding-top:6px">${info.join("")}</div>` : "";
  const logoHtml = logo ? `<div style="padding-top:8px"><img src="${esc(logo)}" alt="${esc(d.company || "Logo")}" height="36" style="display:block;height:36px;width:auto;border:0"></div>` : "";
  const noteHtml = d.note ? `<div style="font-size:11.5px;color:#888888;padding-top:8px;max-width:520px">${esc(d.note).replace(/\n/g, "<br>")}</div>` : "";
  const photoImg = photo ? `<img src="${esc(photo)}" alt="${esc(d.name || "")}" width="84" height="84" style="display:block;width:84px;min-width:84px;max-width:84px;height:84px;border-radius:42px;border:0;object-fit:cover">` : "";
  const text = rows.join("") + infoHtml + logoHtml;
  let body;
  if (d.layout === "top") {
    body = `<table cellpadding="0" cellspacing="0" border="0" style="${base}"><tr><td style="padding-bottom:8px">${photoImg}</td></tr><tr><td style="border-top:3px solid ${color};padding-top:8px">${text}</td></tr></table>`;
  } else if (d.layout === "line") {
    body = `<table cellpadding="0" cellspacing="0" border="0" style="${base}"><tr><td style="border-left:4px solid ${color};padding-left:12px">${text}</td></tr></table>`;
  } else {
    body = `<table cellpadding="0" cellspacing="0" border="0" style="${base}"><tr>` +
      (photoImg ? `<td valign="top" width="84" style="padding-right:14px;width:84px">${photoImg}</td>` : "") +
      `<td valign="top"${photoImg ? ` style="border-left:2px solid ${color};padding-left:14px"` : ""}>${text}</td></tr></table>`;
  }
  return body + noteHtml;
}

/** Bản chữ thuần (cho ứng dụng mail không nhận HTML) */
export function signatureText(d) {
  const L = [];
  if (d.name) L.push(d.name);
  const t = [d.title, d.company].filter(Boolean).join(" · ");
  if (t) L.push(t);
  if (d.phone) L.push("ĐT: " + d.phone);
  if (d.phone2) L.push("Hotline: " + d.phone2);
  if (d.email) L.push("Email: " + d.email);
  const web = normUrl(d.website);
  if (web) L.push("Web: " + shortUrl(web));
  if (d.address) L.push("Địa chỉ: " + d.address);
  return L.length ? "--\n" + L.join("\n") : "";
}
