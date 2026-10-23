/* Tự sinh bởi scripts/build.js từ assets/fonts.js và i18n/en/js/ — đừng sửa tay. */
/* Font chữ có dấu tiếng Việt cho công cụ vẽ chữ lên ảnh (tải bằng FontFace khi cần, từ @fontsource trên jsDelivr). */
const JSD = "https://cdn.jsdelivr.net/npm/";
const VN = "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB";
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212";
const fs = (pkg, name, w) => [`@fontsource/${pkg}@5.3.0/files/${name}-vietnamese-${w}-normal.woff2`, `@fontsource/${pkg}@5.3.0/files/${name}-latin-${w}-normal.woff2`];

/** css: chuỗi dùng cho ctx.font ("{w} {px}px {family}") */
export const FONTS = [
  { id: "bvp-800", label: "Be Vietnam Pro bold", family: "Be Vietnam Pro", weight: 800 },
  { id: "bvp-400", label: "Be Vietnam Pro regular", family: "Be Vietnam Pro", weight: 400 },
  { id: "roboto-slab", label: "Roboto Slab (serif)", family: "Roboto Slab", weight: 700, files: fs("roboto-slab", "roboto-slab", 700) },
  { id: "dancing", label: "Dancing Script (handwriting)", family: "Dancing Script", weight: 700, files: fs("dancing-script", "dancing-script", 700) },
  { id: "pacifico", label: "Pacifico (playful)", family: "Pacifico", weight: 400, files: fs("pacifico", "pacifico", 400) },
  { id: "great-vibes", label: "Great Vibes (calligraphy)", family: "Great Vibes", weight: 400, files: fs("great-vibes", "great-vibes", 400) },
  { id: "serif", label: "Times New Roman", family: "'Times New Roman', Times, serif", weight: 400, system: true }
];
export const fontCss = (f, px) => `${f.weight} ${px}px ${f.system ? f.family : `'${f.family}', sans-serif`}`;

const loaded = new Map();
/** Tải một font (một lần); trả về khi font sẵn sàng để vẽ lên canvas */
export function loadFont(f) {
  if (f.system) return Promise.resolve();
  if (!loaded.has(f.id)) loaded.set(f.id, (async () => {
    if (f.files) await Promise.all(f.files.map(async (u, i) => {
      const ff = new FontFace(f.family, `url(${JSD + u}) format("woff2")`, { weight: String(f.weight), unicodeRange: i === 0 ? VN : LATIN });
      document.fonts.add(await ff.load());
    }));
    await document.fonts.load(fontCss(f, 40), "Aă Đđ Ế ữ");
  })().catch((e) => { loaded.delete(f.id); console.warn(e); }));
  return loaded.get(f.id);
}
