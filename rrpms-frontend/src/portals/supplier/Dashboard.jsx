import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { BoxIcon, TruckIcon, FileIcon, TrendIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/ui/icons.jsx';
import { listRtmBatches, listSupplierReturns } from '../../lib/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartMode, setChartMode] = useState('dual'); // 'dual' | 'financial' | 'volume'
  const [selectedBatch, setSelectedBatch] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bRes, rRes] = await Promise.all([listRtmBatches(), listSupplierReturns()]);
      setBatches(Array.isArray(bRes.data) ? bRes.data : []);
      setReturns(Array.isArray(rRes.data) ? rRes.data : []);
    } catch (e) {
      console.error('supplier Dashboard error:', e);
      setError(e?.response?.data?.detail || 'Unable to synchronize supplier overview metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center animate-pulse">
        <p className="text-sm font-medium text-text-secondary">Loading supplier operations dashboard & analytics…</p>
      </div>
    );
  }

  const activeSuppliers = new Set([...returns.map((r) => r.supplierName), ...batches.map((b) => b.supplierName)]).size;
  const pendingRtm = batches.filter((b) => b.status !== 'SETTLED');
  const pendingRtmValue = pendingRtm.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const settledBatches = batches.filter((b) => b.status === 'SETTLED');
  const totalCreditNotes = batches.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const settledCreditNotes = settledBatches.reduce((s, b) => s + Number(b.creditNoteValue || 0), 0);
  const recoveryRate = batches.length > 0 ? Math.round((settledBatches.length / batches.length) * 100) : 0;

  // Aggregate supplier chart data
  const bySupplier = {};
  returns.forEach((r) => {
    const sName = r.supplierName || 'Unknown';
    if (!bySupplier[sName]) {
      bySupplier[sName] = {
        supplier: sName.replace(/(India|Pvt Ltd|Electronics|Distribution)/gi, '').trim(),
        fullName: sName,
        returns: 0,
        creditNotes: 0,
      };
    }
    bySupplier[sName].returns += (r.quantity || 1);
  });
  batches.forEach((b) => {
    const sName = b.supplierName || 'Unknown';
    if (!bySupplier[sName]) {
      bySupplier[sName] = {
        supplier: sName.replace(/(India|Pvt Ltd|Electronics|Distribution)/gi, '').trim(),
        fullName: sName,
        returns: 0,
        creditNotes: 0,
      };
    }
    bySupplier[sName].creditNotes += Number(b.creditNoteValue || 0);
  });
  const chartData = Object.values(bySupplier);

  const recentBatches = [...batches]
    .sort((a, b) => new Date(b.dispatchDate || 0) - new Date(a.dispatchDate || 0))
    .slice(0, 5);

  const parseBatchItems = (b) => {
    if (!b.itemsJson) return [];
    try {
      const parsed = JSON.parse(b.itemsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-surface rounded-xl border border-danger-200 p-4 shadow-xs flex items-center justify-between">
          <p className="text-sm font-medium text-danger">{error}</p>
          <button
            onClick={loadData}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Suppliers"
          value={activeSuppliers}
          trend="Certified vendor network"
          icon={<BoxIcon />}
          tint="warning"
        />
        <StatCard
          label="Pending RTM Batches"
          value={pendingRtm.length}
          trend={`₹${pendingRtmValue.toLocaleString('en-IN')} pending settlement`}
          icon={<TruckIcon />}
          tint="info"
        />
        <StatCard
          label="Total Credit Notes"
          value={`₹${totalCreditNotes.toLocaleString('en-IN')}`}
          trend={`₹${settledCreditNotes.toLocaleString('en-IN')} reconciled`}
          icon={<FileIcon />}
          tint="success"
        />
        <StatCard
          label="RTM Settlement Rate"
          value={`${recoveryRate}%`}
          trend={`${settledBatches.length} of ${batches.length} batches cleared`}
          icon={<TrendIcon />}
          tint="primary"
        />
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          <span className="font-semibold text-text">Quick Operations:</span>
          <span>Fast track RTM consolidation, vendor reconciliation, and voucher checks.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/supplier/supplier-returns')}>
            📦 Batch Returns
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/supplier/settlement')}>
            💳 Reconcile Settlement
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/supplier/credit-notes')}>
            📄 View Credit Notes
          </Button>
          <Button size="sm" variant="primary" onClick={() => navigate('/supplier/performance')}>
            📈 Vendor Scorecards
          </Button>
        </div>
      </div>

      {/* Analytics Chart & Active Batches Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analytics Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="font-bold text-text text-base">Returns Volume & Credit Notes by Supplier</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Dual-axis analytics preventing scale suppression between unit quantities and financial recovery.
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-surface-raised p-1 rounded-lg border border-border text-xs">
              <button
                onClick={() => setChartMode('dual')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  chartMode === 'dual' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                Dual Axis
              </button>
              <button
                onClick={() => setChartMode('financial')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  chartMode === 'financial' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                Values (₹)
              </button>
              <button
                onClick={() => setChartMode('volume')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  chartMode === 'volume' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                Units
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="text-sm text-text-muted py-12 text-center">No supplier return data registered yet.</p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 15, left: 5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="supplier" tick={{ fontSize: 12, fill: 'currentColor' }} />
                  
                  {chartMode === 'dual' ? (
                    <>
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        tickFormatter={(v) => `${v} u`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                    </>
                  ) : chartMode === 'financial' ? (
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                    />
                  ) : (
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      tickFormatter={(v) => `${v} units`}
                    />
                  )}

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-surface border border-border p-3 rounded-xl shadow-xl text-xs space-y-1.5">
                          <p className="font-bold text-text border-b border-border pb-1">
                            {payload[0]?.payload?.fullName || label}
                          </p>
                          <p className="text-amber-600 dark:text-amber-400 font-medium">
                            Returned Units: <strong>{payload[0]?.payload?.returns || 0} units</strong>
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Credit Note Value: <strong>₹{Number(payload[0]?.payload?.creditNotes || 0).toLocaleString('en-IN')}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend />

                  {(chartMode === 'dual' || chartMode === 'volume') && (
                    <Bar
                      yAxisId={chartMode === 'dual' ? 'left' : undefined}
                      dataKey="returns"
                      fill="#F59E0B"
                      name="Return Volume (Units)"
                      radius={[4, 4, 0, 0]}
                    />
                  )}

                  {(chartMode === 'dual' || chartMode === 'financial') && (
                    <Bar
                      yAxisId={chartMode === 'dual' ? 'right' : undefined}
                      dataKey="creditNotes"
                      fill="#10B981"
                      name="Credit Note Value (₹)"
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent RTM Batches Trackers */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <h2 className="font-bold text-text text-base">Active RTM Consignments</h2>
              <button
                onClick={() => navigate('/supplier/rtm-batches')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View All →
              </button>
            </div>

            {recentBatches.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">No RTM batches registered.</p>
            ) : (
              <div className="space-y-3.5">
                {recentBatches.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBatch(b)}
                    className="p-3 bg-surface-raised rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-600 font-bold font-mono">
                        RTM-{String(b.id).slice(0, 8)}
                      </span>
                      <StatusBadge value={b.status} />
                    </div>
                    <p className="text-sm font-semibold text-text">{b.supplierName}</p>
                    <div className="flex items-center justify-between text-xs text-text-muted pt-0.5">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        ₹{Number(b.creditNoteValue || 0).toLocaleString('en-IN')}
                      </span>
                      <span>
                        {b.dispatchDate
                          ? new Date(b.dispatchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : 'Pending Dispatch'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => navigate('/supplier/settlement')}
            >
              Open Settlement Pipeline →
            </Button>
          </div>
        </div>
      </div>

      {/* Mini Manifest Modal when clicking a batch in dashboard */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-text text-base">RTM Batch Summary</h3>
                <p className="text-xs text-orange-600 font-mono mt-0.5">ID: {String(selectedBatch.id).slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-text-muted hover:text-text text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-muted">Supplier:</span>
                <span className="font-semibold text-text">{selectedBatch.supplierName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-muted">Status:</span>
                <StatusBadge value={selectedBatch.status} />
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-muted">Credit Note Value:</span>
                <span className="font-bold text-emerald-600">₹{Number(selectedBatch.creditNoteValue || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-text-muted">Courier Tracking (AWB):</span>
                <span className="font-mono text-text">{selectedBatch.awbNumber || 'DEL-RTM-882910'}</span>
              </div>
            </div>

            {selectedBatch.disputed && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <strong>Dispute Alert:</strong> {selectedBatch.disputeNotes}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedBatch(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedBatch(null);
                  navigate('/supplier/settlement');
                }}
              >
                Go to Settlement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
