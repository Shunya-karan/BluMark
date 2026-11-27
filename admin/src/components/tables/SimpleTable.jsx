export default function SimpleTable({ columns, rows, rowKey = "id", empty = "No records found." }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
            {columns.map((c) => (
              <th className="px-3 py-3 font-semibold" key={c.label}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.length ? (
            rows.map((row, index) => (
              <tr
                key={row[rowKey] || index}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
              >
                {columns.map((c) => (
                  <td className="px-3 py-3.5" key={c.label}>
                    {c.render ? c.render(row) : row[c.key] || "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-8 text-center text-slate-400" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
