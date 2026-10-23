/* Tự sinh bởi scripts/build.js từ assets/tools/sql-formatter.js và i18n/en/js/ — đừng sửa tay. */
/* Định dạng SQL: làm đẹp câu lệnh theo từng hệ quản trị (sql-formatter), hoặc rút gọn thành một dòng */
import { lib } from "../core.js";
import { textTool } from "../frames/text.js";
import { compactSql } from "../lib/minify.js";

const DIALECTS = [["sql", "Standard SQL"], ["mysql", "MySQL"], ["mariadb", "MariaDB"], ["postgresql", "PostgreSQL"], ["tsql", "SQL Server (T-SQL)"], ["plsql", "Oracle (PL/SQL)"], ["sqlite", "SQLite"], ["bigquery", "BigQuery"], ["snowflake", "Snowflake"], ["redshift", "Redshift"], ["spark", "Spark SQL"], ["db2", "IBM Db2"], ["trino", "Trino / Presto"]];

textTool({
  mono: true,
  inputLabel: "SQL statement",
  outputLabel: "Result",
  placeholder: "select id, full_name from employees where department = 'Accounting' order by full_name",
  sample: "select e.emp_id, e.full_name, d.dept_name, sum(p.salary) as total_salary from employees e inner join departments d on d.id = e.dept_id left join payroll p on p.emp_id = e.emp_id and p.year = 2026 where e.status = 'active' and d.dept_name in ('Accounting', 'Sales') group by e.emp_id, e.full_name, d.dept_name having sum(p.salary) > 100000 order by total_salary desc limit 20;",
  options: [
    { id: "dialect", label: "Database", value: "sql", choices: DIALECTS },
    { id: "kw", label: "Keywords", value: "upper", choices: [["upper", "UPPERCASE"], ["lower", "lowercase"], ["preserve", "Keep as is"]] },
    { id: "indent", label: "Indent", value: "2", choices: [["2", "2 spaces"], ["4", "4 spaces"], ["tab", "Tab"], ["min", "Minify to 1 line"]] }
  ],
  download: { name: "query.sql", type: "application/sql" },
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    if (o.indent === "min") return { text: compactSql(text) };
    const f = await lib("sqlFormatter");
    try {
      return { text: f.format(text, { language: o.dialect, keywordCase: o.kw, dataTypeCase: o.kw, functionCase: o.kw, tabWidth: o.indent === "4" ? 4 : 2, useTabs: o.indent === "tab", linesBetweenQueries: 1 }) };
    } catch (e) {
      const m = /line (\d+) column (\d+)/i.exec(e.message);
      return { text: "", error: "Couldn't parse the statement" + (m ? ` (line ${m[1]}, column ${m[2]})` : "") + ". Try choosing the database you're using." };
    }
  }
});
