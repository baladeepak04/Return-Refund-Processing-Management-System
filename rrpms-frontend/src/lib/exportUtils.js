/**
 * Utility to convert tabular records into a downloadable CSV file.
 * Handles escaping of commas, quotes, and newlines.
 * 
 * @param {string} filename - The desired base name of the CSV file.
 * @param {Array<{key: string, label: string}>} columns - Header definitions.
 * @param {Array<object>} rows - The data records to export.
 */
export function exportToCSV(filename, columns, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  // Header row
  const headerLine = columns.map(c => `"${(c.label || c.key).replace(/"/g, '""')}"`).join(',');

  // Data rows
  const dataLines = rows.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (typeof c.accessor === 'function') {
        val = c.accessor(row);
      }
      if (val === null || val === undefined) {
        return '""';
      }
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });

  const csvContent = [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
