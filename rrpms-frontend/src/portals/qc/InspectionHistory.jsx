import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/ui/DataTable.jsx';
import { GradeBadge } from '../../components/ui/StatusBadge.jsx';
import { DISPOSITION_LABEL } from '../../lib/enums.js';
import { listQcInspections, listReturns } from '../../lib/api.js';

export default function InspectionHistory() {
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [qcRes, retRes] = await Promise.all([
          listQcInspections(),
          listReturns().catch(() => ({ data: [] })),
        ]);
        const returns = Array.isArray(retRes.data) ? retRes.data : [];
        const retMap = new Map(returns.map((r) => [r.id, r]));

        const rawRows = Array.isArray(qcRes.data) ? qcRes.data : [];
        const enriched = rawRows.map((r) => {
          const ret = retMap.get(r.returnRequest?.id) || r.returnRequest || {};
          const customerName =
            ret.customerName ||
            r.returnRequest?.customerName ||
            (ret.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : '—');
          const customerEmail = ret.customerEmail || r.returnRequest?.customerEmail || '';
          const productName =
            ret.items?.[0]?.productName ||
            r.returnRequest?.items?.[0]?.productName ||
            'General Merchandise';
          const returnId = r.returnRequest?.id || ret.id || '';
          const inspectorName = r.inspector?.name || '—';

          return {
            ...r,
            returnId,
            customerName,
            customerEmail,
            productName,
            inspectorName,
            dispositionLabel: DISPOSITION_LABEL[r.disposition] || r.disposition,
          };
        });

        // Sort newest first by default
        enriched.sort((a, b) => new Date(b.inspectedAt || 0) - new Date(a.inspectedAt || 0));

        setRows(enriched);
      } catch (e) {
        console.error('qc InspectionHistory error:', e);
        setError(e?.response?.data?.detail || 'Unable to retrieve quality control inspection history.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = [
    {
      key: 'id',
      header: 'QC ID',
      render: (r) => (
        <span className="text-orange-500 font-mono font-semibold text-xs">
          #{String(r.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'returnId',
      header: 'Return ID',
      render: (r) => (
        <span className="text-primary font-mono font-medium text-xs">
          #{String(r.returnId).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer Name',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-text text-xs">{r.customerName}</p>
          {r.customerEmail && (
            <p className="text-[10px] text-text-muted">{r.customerEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'productName',
      header: 'Product Name',
      sortable: true,
      render: (r) => (
        <div className="max-w-[210px]">
          <p className="font-medium text-text text-xs line-clamp-1" title={r.productName}>
            {r.productName}
          </p>
          <span className="text-[10px] text-text-muted">
            {r.returnRequest?.reasonCode || 'Return Item'}
          </span>
        </div>
      ),
    },
    {
      key: 'inspectorName',
      header: 'Inspector',
      sortable: true,
      render: (r) => (
        <span className="text-xs font-medium text-text">
          {r.inspectorName}
        </span>
      ),
    },
    {
      key: 'inspectedAt',
      header: 'Inspected (Date & Time)',
      sortable: true,
      render: (r) =>
        r.inspectedAt ? (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs">
              {new Date(r.inspectedAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-[10px] text-text-muted font-mono font-medium">
              {new Date(r.inspectedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'conditionGrade',
      header: 'Grade',
      render: (r) => <GradeBadge grade={r.conditionGrade} />,
    },
    {
      key: 'disposition',
      header: 'Disposition',
      render: (r) => (
        <span className="text-xs font-medium text-slate-700">
          {r.dispositionLabel}
        </span>
      ),
    },
    {
      key: 'functionalTest',
      header: 'Functional Test',
      render: (r) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            r.functionalTest === 'PASS'
              ? 'bg-success-50 text-success'
              : r.functionalTest === 'FAIL'
              ? 'bg-danger-50 text-danger'
              : 'bg-gray-100 text-text-secondary'
          }`}
        >
          {r.functionalTest}
        </span>
      ),
    },
  ];

  if (loading) return <p className="text-sm text-text-secondary p-6">Loading inspection history…</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          {error}
        </div>
      )}
      <DataTable
        title="Quality Control Inspection History"
        columns={columns}
        rows={rows}
        initialSortKey="inspectedAt"
        initialSortDir="desc"
        searchKeys={[
          'id',
          'returnId',
          'customerName',
          'customerEmail',
          'productName',
          'inspectorName',
          'dispositionLabel',
          'conditionGrade',
        ]}
        exportFilename="inspection-history"
        initialQuery={params.get('q') || ''}
      />
    </div>
  );
}
