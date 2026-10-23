/* Tự sinh bởi scripts/build.js từ assets/tools/minifier.js và i18n/en/js/ — đừng sửa tay. */
/* Nén JS/CSS/HTML: rút gọn JavaScript (Terser), CSS (CSSO), HTML (gom khoảng trắng, nén script/style bên trong), JSON */
import { lib, fmtSize } from "../core.js";
import { textTool } from "../frames/text.js";
import { detectLang, minifyHtml } from "../lib/minify.js";

const SAMPLES = {
  js: "// Calculate the cart total\nfunction cartTotal(cart, discount = 0) {\n  let total = 0;\n  for (const product of cart) {\n    total += product.price * product.quantity;\n  }\n  // apply the discount code\n  const amount = total * (1 - discount / 100);\n  return Math.round(amount * 100) / 100;\n}\n\nconsole.log(cartTotal([{ price: 15.5, quantity: 2 }, { price: 9.9, quantity: 1 }], 10));\n",
  css: "/* Primary button */\n.btn-primary {\n  display: inline-flex;\n  padding: 10px 16px;\n  background-color: #3e5bf2;\n  color: #ffffff;\n  border-radius: 12px;\n  margin: 0px 0px 0px 0px;\n}\n\n.btn-primary:hover {\n  background-color: #2d48d6;\n}\n",
  html: "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <!-- About page -->\n    <title>Hello</title>\n    <style>\n      body { font-family: sans-serif; margin: 0px; }\n    </style>\n  </head>\n  <body>\n    <h1>  Hello   everyone  </h1>\n    <p>\n      This is a sample page.\n    </p>\n    <script>\n      const greeting = \"Hello\";\n      console.log( greeting );\n    </script>\n  </body>\n</html>\n"
};

async function minJs(src) {
  const T = await lib("terser");
  const r = await T.minify(src, { compress: { passes: 2 }, mangle: true, format: { comments: /^!|@license|@preserve/ } });
  return r.code;
}
async function minCss(src) {
  const c = await lib("csso");
  return c.minify(src).css;
}

textTool({
  mono: true,
  inputLabel: "Source code",
  outputLabel: "Minified",
  placeholder: "Paste JavaScript, CSS or HTML code…",
  sample: (o) => SAMPLES[o.lang === "auto" || o.lang === "json" ? "js" : o.lang],
  options: [{ id: "lang", label: "Language", value: "auto", choices: [["auto", "Auto-detect"], ["js", "JavaScript"], ["css", "CSS"], ["html", "HTML"], ["json", "JSON"]] }],
  download: { name: (o) => "minified." + (o.lang === "auto" ? "txt" : o.lang), type: "text/plain" },
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    const lang = o.lang === "auto" ? detectLang(text) : o.lang;
    let res;
    try {
      if (lang === "js") res = await minJs(text);
      else if (lang === "css") res = await minCss(text);
      else if (lang === "json") res = JSON.stringify(JSON.parse(text));
      else res = await minifyHtml(text, { minifyJs: minJs, minifyCss: minCss });
    } catch (e) {
      if (e.userMsg) throw e;
      const where = e.line ? ` (line ${e.line}, column ${(e.col ?? 0) + 1})` : "";
      return { text: "", error: `${lang.toUpperCase()} code has a syntax error${where}: ${e.message}` };
    }
    const a = new TextEncoder().encode(text).length, b = new TextEncoder().encode(res).length;
    return { text: res, info: `${lang.toUpperCase()}${o.lang === "auto" ? " (auto-detected)" : ""}: ${fmtSize(a)} → ${fmtSize(b)}, ${a ? Math.round((1 - b / a) * 100) : 0}% smaller` };
  }
});
