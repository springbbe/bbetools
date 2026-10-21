/* Định dạng SQL: làm đẹp câu lệnh theo từng hệ quản trị (sql-formatter), hoặc rút gọn thành một dòng */
import { lib } from "../core.js";
import { textTool } from "../frames/text.js";
import { compactSql } from "../lib/minify.js";

const DIALECTS = [["sql", "SQL chuẩn"], ["mysql", "MySQL"], ["mariadb", "MariaDB"], ["postgresql", "PostgreSQL"], ["tsql", "SQL Server (T-SQL)"], ["plsql", "Oracle (PL/SQL)"], ["sqlite", "SQLite"], ["bigquery", "BigQuery"], ["snowflake", "Snowflake"], ["redshift", "Redshift"], ["spark", "Spark SQL"], ["db2", "IBM Db2"], ["trino", "Trino / Presto"]];

textTool({
  mono: true,
  inputLabel: "Câu lệnh SQL",
  outputLabel: "Kết quả",
  placeholder: "select id, ho_ten from nhan_vien where phong_ban = 'Kế toán' order by ho_ten",
  sample: "select nv.ma_nv, nv.ho_ten, pb.ten_phong, sum(l.luong) as tong_luong from nhan_vien nv inner join phong_ban pb on pb.id = nv.phong_ban_id left join bang_luong l on l.ma_nv = nv.ma_nv and l.nam = 2026 where nv.trang_thai = 'dang_lam' and pb.ten_phong in ('Kế toán', 'Kinh doanh') group by nv.ma_nv, nv.ho_ten, pb.ten_phong having sum(l.luong) > 100000000 order by tong_luong desc limit 20;",
  options: [
    { id: "dialect", label: "Hệ quản trị", value: "sql", choices: DIALECTS },
    { id: "kw", label: "Từ khoá", value: "upper", choices: [["upper", "IN HOA"], ["lower", "thường"], ["preserve", "Giữ nguyên"]] },
    { id: "indent", label: "Thụt lề", value: "2", choices: [["2", "2 dấu cách"], ["4", "4 dấu cách"], ["tab", "Tab"], ["min", "Rút gọn 1 dòng"]] }
  ],
  download: { name: "cau-lenh.sql", type: "application/sql" },
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    if (o.indent === "min") return { text: compactSql(text) };
    const f = await lib("sqlFormatter");
    try {
      return { text: f.format(text, { language: o.dialect, keywordCase: o.kw, dataTypeCase: o.kw, functionCase: o.kw, tabWidth: o.indent === "4" ? 4 : 2, useTabs: o.indent === "tab", linesBetweenQueries: 1 }) };
    } catch (e) {
      const m = /line (\d+) column (\d+)/i.exec(e.message);
      return { text: "", error: "Không phân tích được câu lệnh" + (m ? ` (dòng ${m[1]}, cột ${m[2]})` : "") + ". Thử chọn đúng hệ quản trị đang dùng." };
    }
  }
});
