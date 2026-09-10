const safeCell = (value) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

export function downloadCsv(filename, rows, fields) {
  const csv = [fields.map((field) => safeCell(field.label)).join(','), ...rows.map((row) => fields.map((field) => `"${safeCell(field.value(row))}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
