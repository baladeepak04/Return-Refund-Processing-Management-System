import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button.jsx';
import { jsPDF } from 'jspdf';

// columns: [{ key, header, render?(row), sortable? }]
// selectable: if true, renders a checkbox column and calls onSelectionChange(selectedRows) whenever it changes.
export default function DataTable({
  title,
  columns,
  rows,
  actions,
  searchKeys,
  exportFilename = 'export',
  initialQuery = '',
  initialSortKey = null,
  initialSortDir = 'desc',
  selectable = false,
  onSelectionChange,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);
  const [exported, setExported] = useState(false);
  const [exportedPdf, setExportedPdf] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const filtered = useMemo(() => {
    let data = rows;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const keys = searchKeys || columns.map((c) => c.key);
      data = data.filter((row) =>
        keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      data = [...data].sort((a, b) => {
        let av = a[sortKey];
        let bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;

        let cmp = 0;
        const aDate = av instanceof Date ? av.getTime() : (typeof av === 'string' && (av.includes('T') || av.includes('-')) && !isNaN(Date.parse(av))) ? Date.parse(av) : null;
        const bDate = bv instanceof Date ? bv.getTime() : (typeof bv === 'string' && (bv.includes('T') || bv.includes('-')) && !isNaN(Date.parse(bv))) ? Date.parse(bv) : null;

        if (aDate !== null && bDate !== null) {
          cmp = aDate - bDate;
        } else if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return data;
  }, [rows, query, sortKey, sortDir, searchKeys, columns]);

  useEffect(() => {
    if (!selectable) return;
    onSelectionChange?.(rows.filter((r) => selectedIds.has(r.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  useEffect(() => {
    // drop stale selections if rows are refreshed/removed from under us
    setSelectedIds(
      (prev) =>
        new Set([...prev].filter((id) => rows.some((r) => r.id === id)))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((r) => r.id))
    );
  }

  function extractTextFromReactNode(node) {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromReactNode).filter(Boolean).join(' ');
    if (React.isValidElement(node)) {
      return extractTextFromReactNode(node.props?.children);
    }
    return '';
  }

  function getCleanCellValue(row, col) {
    let text = '';
    // 1. If col.render is provided, attempt to extract rendered string/text from React nodes
    if (typeof col.render === 'function') {
      try {
        const rendered = col.render(row);
        const extracted = extractTextFromReactNode(rendered);
        if (extracted && extracted.trim() && extracted !== '—') {
          text = extracted.trim();
        }
      } catch (_) {}
    }

    // 2. Direct key or nested fallback lookup
    if (!text) {
      let raw = row[col.key];
      if (raw === null || raw === undefined || raw === '') {
        if (col.key === 'returnId') raw = row.returnRequestId || row.returnRequest?.id;
        else if (col.key === 'inspectorName') raw = row.inspector?.name;
        else if (col.key === 'customerName') raw = row.customer?.name;
        else if (col.key === 'orderId') raw = row.order?.id;
      }

      if (raw !== null && raw !== undefined) {
        if (typeof raw === 'object') {
          if (raw.name) text = String(raw.name);
          else if (raw.id) text = String(raw.id);
          else text = '';
        } else {
          text = String(raw).trim();
        }
      }
    }

    if (!text) return '—';

    // 3. Format raw ISO date strings into clean human-readable date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
      try {
        const d = new Date(text);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      } catch (_) {}
    }

    // 4. Shorten full 36-char UUIDs to 8 chars
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      return text.slice(0, 8);
    }

    // 5. Replace Unicode Indian Rupee symbol with 'INR ' for standard jsPDF encoding
    text = text.replace(/₹\s*/g, 'INR ');

    return text;
  }

  function handleExport() {
    if (filtered.length === 0) return;
    const headers = columns.map((c) => `"${String(c.header).replace(/"/g, '""')}"`);
    const csvRows = filtered.map((row) =>
      columns
        .map((c) => `"${getCleanCellValue(row, c).replace(/"/g, '""')}"`)
        .join(',')
    );
    // Include UTF-8 BOM (\uFEFF) so Excel and spreadsheet apps parse ₹ and Unicode correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  function handleExportPdf() {
    if (filtered.length === 0) return;
    const isLandscape = columns.length > 5;
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: isLandscape ? 'landscape' : 'portrait',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    let y = 14;

    // Header Accent Banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(79, 70, 229); // Indigo-600 top stripe
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('RETURNFLOW ENTERPRISE', marginX, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(String(title || 'Data Export Report').toUpperCase(), marginX, 16);

    const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    doc.text(`Generated: ${dateStr} | Total Records: ${filtered.length}`, pageWidth - marginX, 16, { align: 'right' });

    y = 30;

    // Proportional Column Widths based on header and sample content length
    const usableWidth = pageWidth - marginX * 2;
    const weights = columns.map((col) => {
      const headerLen = String(col.header).length;
      let maxLen = headerLen;
      for (let i = 0; i < Math.min(filtered.length, 15); i++) {
        const val = getCleanCellValue(filtered[i], col);
        if (val.length > maxLen) maxLen = val.length;
      }
      return Math.max(10, Math.min(maxLen, 35));
    });
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const colWidths = weights.map((w) => (w / totalWeight) * usableWidth);

    function drawTableHeader(curY) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(marginX, curY, usableWidth, 8, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, curY, usableWidth, 8, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      let curX = marginX;
      columns.forEach((col, idx) => {
        const w = colWidths[idx];
        doc.text(String(col.header), curX + 2, curY + 5.5, { maxWidth: w - 4 });
        curX += w;
      });
      return curY + 8;
    }

    y = drawTableHeader(y);

    // Table Rows with Dynamic Row Height and Clean Wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    filtered.forEach((row, rowIdx) => {
      // Calculate lines for each cell in this row
      const cellData = columns.map((col, idx) => {
        const w = colWidths[idx];
        const rawVal = getCleanCellValue(row, col) || '—';
        const lines = doc.splitTextToSize(rawVal, w - 4);
        return { lines, width: w };
      });

      const maxLines = Math.max(1, ...cellData.map((c) => c.lines.length));
      const rowHeight = Math.max(7, maxLines * 3.8 + 2.5);

      // Handle page overflow cleanly
      if (y + rowHeight > pageHeight - 16) {
        doc.addPage();
        y = 15;
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      // Zebra background
      if (rowIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(marginX, y, usableWidth, rowHeight, 'F');
      }

      // Render cell text lines
      doc.setTextColor(51, 65, 85); // slate-700
      let curX = marginX;
      cellData.forEach(({ lines, width }) => {
        doc.text(lines, curX + 2, y + 4.2);
        curX += width;
      });

      // Bottom border line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(marginX, y + rowHeight, marginX + usableWidth, y + rowHeight);

      y += rowHeight;
    });

    // Final Page Footers
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('ReturnFlow Operations · System Generated Record', marginX, pageHeight - 8);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
    }

    doc.save(`${exportFilename}-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExportedPdf(true);
    setTimeout(() => setExportedPdf(false), 2000);
  }

  return (
    <div className="bg-white border border-border/80 rounded-xl shadow-xs overflow-hidden transition-all">
      <div className="flex items-center justify-between p-5 pb-4 flex-wrap gap-3 border-b border-border/60 bg-slate-50/40">
        {title && (
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-text text-base">
              {title}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {filtered.length}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {selectable && selectedIds.size > 0 && (
            <span className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100">
              {selectedIds.size} selected
            </span>
          )}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search table..."
              aria-label={title ? `Search ${title}` : 'Search table'}
              className="border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs w-56 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="text-xs font-medium"
          >
            {exported ? '✓ CSV' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={filtered.length === 0}
            className="text-xs font-medium"
          >
            {exportedPdf ? '✓ PDF' : 'Export PDF'}
          </Button>
          {actions}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {title && <caption className="sr-only">{title}</caption>}
          <thead>
            <tr className="bg-slate-50/60 border-b border-border text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {selectable && (
                <th scope="col" className="px-5 py-3 w-8">
                  <label className="sr-only" htmlFor="select-all-rows">
                    Select all rows
                  </label>
                  <input
                    id="select-all-rows"
                    type="checkbox"
                    className="rounded border-slate-300 text-primary focus:ring-primary/20"
                    checked={
                      filtered.length > 0 && selectedIds.size === filtered.length
                    }
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => col.sortable && handleSort(col.key)}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={`px-5 py-3 font-semibold transition-colors ${
                    col.sortable
                      ? 'cursor-pointer select-none hover:text-slate-900 hover:bg-slate-100/60'
                      : ''
                  }`}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400 font-bold">
                        {sortKey === col.key
                          ? sortDir === 'asc'
                            ? '▲'
                            : '▼'
                          : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-5 py-12 text-center text-text-muted"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-xl opacity-40">🔍</span>
                    <p className="font-medium text-xs">No matching records found</p>
                    {query && (
                      <p className="text-[11px] text-slate-400">
                        Try adjusting your search criteria
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="hover:bg-slate-50/80 transition-colors duration-100 group"
                >
                  {selectable && (
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary/20"
                        aria-label={`Select row ${i + 1}`}
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-5 py-3.5 text-xs text-text font-normal group-hover:text-slate-900"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
