import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCommunications, listUsers, listReturns } from '../../lib/api.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { humanize } from '../../lib/enums.js';
import { SearchIcon, ActivityIcon, CheckIcon, ClockIcon, CloseIcon } from '../../components/ui/icons.jsx';
import { useToast } from '../../lib/ToastContext.jsx';
import { exportToCSV } from '../../lib/exportUtils.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';

const MESSAGE_TEMPLATES = [
  {
    key: 'DELAY',
    label: '🌦️ Weather / Courier Transit Delay',
    channel: 'SMS',
    text: 'Dear Customer, your doorstep pickup has been slightly delayed due to severe weather/traffic conditions. Our courier executive will arrive in the next operational window.',
  },
  {
    key: 'QC_PASSED',
    label: '🔍 QC Inspection Passed & Restocked',
    channel: 'WHATSAPP',
    text: 'Great news! Your returned item has successfully passed warehouse technical QC inspection. Your refund has been authorized for immediate disbursement.',
  },
  {
    key: 'REFUND_EXPEDITE',
    label: '⚡ Refund Expedited to Account/UPI',
    channel: 'EMAIL',
    text: 'Your refund disbursement has been expedited. The funds have been initiated to your original payment method and will reflect within 24 business hours.',
  },
  {
    key: 'PHOTOS_NEEDED',
    label: '📸 Additional Evidence / Photos Requested',
    channel: 'WHATSAPP',
    text: 'Our warehouse inspection team requires an additional clear photo of the product serial number / brand seal to finalize your return claim.',
  },
];

function ChannelIcon({ channel }) {
  if (channel === 'WHATSAPP') {
    return (
      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
        WA
      </span>
    );
  }
  if (channel === 'EMAIL') {
    return (
      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
        ✉
      </span>
    );
  }
  return (
    <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
      SMS
    </span>
  );
}

export default function ActivityTimeline() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  
  // Dispatch notice modal states
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('WHATSAPP');
  const [messageBody, setMessageBody] = useState(MESSAGE_TEMPLATES[0].text);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [commsRes, usersRes, returnsRes] = await Promise.all([
          listCommunications(),
          listUsers().catch(() => ({ data: [] })),
          listReturns().catch(() => ({ data: [] })),
        ]);
        setRows(Array.isArray(commsRes.data) ? commsRes.data : []);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        const rList = Array.isArray(returnsRes.data) ? returnsRes.data : [];
        setReturns(rList);
        if (rList.length > 0) setSelectedReturnId(rList[0].id);
      } catch (e) {
        console.error('support ActivityTimeline error:', e);
        setError(e?.response?.data?.detail || 'Unable to retrieve communication activity log.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      if (u.id) map.set(String(u.id).toLowerCase(), u);
    });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const eventMatch = (c.eventType || '').toLowerCase().includes(q);
      const ret = c.returnRequest;
      const u = ret?.customerId ? userMap.get(String(ret.customerId).toLowerCase()) : null;
      const customerName = u?.name || ret?.customerName || '';
      const customerEmail = u?.email || ret?.customerEmail || '';
      const productName = ret?.items?.[0]?.productName || '';
      const returnId = ret?.id ? String(ret.id).toLowerCase() : '';

      return (
        eventMatch ||
        customerName.toLowerCase().includes(q) ||
        customerEmail.toLowerCase().includes(q) ||
        productName.toLowerCase().includes(q) ||
        returnId.includes(q)
      );
    });
  }, [rows, userMap, channelFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      sms: rows.filter((r) => r.channel === 'SMS').length,
      whatsapp: rows.filter((r) => r.channel === 'WHATSAPP').length,
      email: rows.filter((r) => r.channel === 'EMAIL').length,
    };
  }, [rows]);

  function handleExportCSV() {
    const cols = [
      { key: 'eventType', label: 'Event Type', accessor: (r) => humanize(r.eventType) },
      { key: 'channel', label: 'Channel' },
      { key: 'status', label: 'Status' },
      { key: 'customerName', label: 'Customer Name', accessor: (r) => {
        const ret = r.returnRequest;
        const u = ret?.customerId ? userMap.get(String(ret.customerId).toLowerCase()) : null;
        return u?.name || ret?.customerName || 'N/A';
      }},
      { key: 'returnId', label: 'Return ID', accessor: (r) => r.returnRequest?.id ? String(r.returnRequest.id).slice(0, 8) : 'N/A' },
      { key: 'message', label: 'Message Content', accessor: (r) => r.message || r.template || '' },
      { key: 'sentAt', label: 'Sent Date', accessor: (r) => r.sentAt ? new Date(r.sentAt).toISOString() : '' },
    ];
    exportToCSV('returnflow_customer_communications', cols, filtered);
  }

  async function handleDispatchNotice() {
    if (!messageBody.trim()) {
      alert('Please enter message text to dispatch.');
      return;
    }
    setDispatching(true);
    try {
      const targetReturn = returns.find((r) => r.id === selectedReturnId) || returns[0];
      const targetUser = targetReturn?.customerId ? userMap.get(String(targetReturn.customerId).toLowerCase()) : null;

      const newComm = {
        id: 'cm-' + Date.now(),
        channel: selectedChannel,
        eventType: isInternalNote ? 'INTERNAL_AGENT_NOTE' : 'AGENT_DIRECT_DISPATCH',
        status: 'SENT',
        sentAt: new Date().toISOString(),
        message: messageBody,
        returnRequest: targetReturn || { id: selectedReturnId, customerId: targetUser?.id, customerName: targetUser?.name },
      };

      setRows((prev) => [newComm, ...prev]);
      addToast(
        isInternalNote
          ? 'Internal case note saved to return timeline.'
          : `Live notification dispatched to ${targetUser?.name || 'Customer'} via ${selectedChannel}.`,
        'success',
        isInternalNote ? 'Internal Note Logged' : 'Notification Dispatched'
      );
      setShowDispatchModal(false);
      setMessageBody(MESSAGE_TEMPLATES[0].text);
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setDispatching(false);
    }
  }

  if (loading) return <p className="text-sm text-text-secondary py-10 text-center animate-pulse">Loading milestone activity stream…</p>;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ActivityIcon className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-text text-lg">Customer Communications & Milestone Activity</h2>
          </div>
          <p className="text-xs text-text-muted">
            Audit trail of automated SMS, Email, and WhatsApp status updates dispatched to customers during reverse logistics.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-border text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download full communications audit log as CSV"
          >
            📥 Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowDispatchModal(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>✉ Dispatch Notice</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3.5 shadow-2xs">
          <span className="text-xs text-text-muted">Total Dispatched</span>
          <p className="text-xl font-bold text-text mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3.5 shadow-2xs">
          <span className="text-xs text-emerald-700 font-medium">WhatsApp Updates</span>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.whatsapp}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3.5 shadow-2xs">
          <span className="text-xs text-purple-700 font-medium">SMS Alerts</span>
          <p className="text-xl font-bold text-purple-700 mt-0.5">{stats.sms}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3.5 shadow-2xs">
          <span className="text-xs text-blue-700 font-medium">Email Summaries</span>
          <p className="text-xl font-bold text-blue-700 mt-0.5">{stats.email}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface border border-border rounded-xl p-3 shadow-2xs">
        <div className="relative flex-1 w-full">
          <SearchIcon className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, product, event, or return ID..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
          {['ALL', 'WHATSAPP', 'SMS', 'EMAIL'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                channelFilter === ch
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {ch === 'ALL' ? 'All Channels' : humanize(ch)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline Stream */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-xl p-10 text-center text-text-muted text-sm">
          No communication events match the selected criteria.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
          {filtered.map((c) => {
            const ret = c.returnRequest;
            const u = ret?.customerId ? userMap.get(String(ret.customerId).toLowerCase()) : null;
            const customerName = u?.name || ret?.customerName || (ret?.customerId ? `Customer ${String(ret.customerId).slice(0, 8)}` : null);
            const customerEmail = u?.email || ret?.customerEmail;
            const productName = ret?.items?.[0]?.productName || 'Order Product';
            const returnId = ret?.id ? String(ret.id).slice(0, 8) : null;

            return (
              <div key={c.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3.5 min-w-0">
                  <ChannelIcon channel={c.channel} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-text">
                        {humanize(c.eventType)}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        via {humanize(c.channel)}
                      </span>
                      {returnId && (
                        <button
                          onClick={() => navigate(`/support/return-lookup?q=${returnId}`)}
                          className="font-mono text-xs font-semibold text-primary bg-primary-50 px-1.5 py-0.5 rounded hover:underline"
                          title="Open Return Case"
                        >
                          #{returnId}
                        </button>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                      {customerName && (
                        <span
                          className="font-semibold text-slate-800 hover:text-primary cursor-pointer"
                          onClick={() => ret?.customerId && navigate(`/support/customer-history?customerId=${ret.customerId}&customerName=${encodeURIComponent(customerName)}`)}
                        >
                          {customerName}
                        </span>
                      )}
                      {customerEmail && <span className="text-slate-500">({customerEmail})</span>}
                      {customerName && <span>·</span>}
                      <span className="font-medium text-slate-700 truncate max-w-sm" title={productName}>
                        {productName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                  <StatusBadge value={c.status} />
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {c.sentAt ? new Date(c.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Customer Notice & Case Note Modal */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title="Dispatch Customer Communication or Case Note"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Dispatch Mode Selector */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                !isInternalNote ? 'bg-white text-primary shadow-xs' : 'text-slate-600'
              }`}
            >
              ✉ Customer Communication (Omnichannel)
            </button>
            <button
              type="button"
              onClick={() => setIsInternalNote(true)}
              className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                isInternalNote ? 'bg-white text-primary shadow-xs' : 'text-slate-600'
              }`}
            >
              📝 Internal Agent Case Note
            </button>
          </div>

          {/* Target Return Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Return Case:
            </label>
            <select
              value={selectedReturnId}
              onChange={(e) => setSelectedReturnId(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-white text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {returns.map((r) => {
                const u = r.customerId ? userMap.get(String(r.customerId).toLowerCase()) : null;
                const name = u?.name || r.customerName || 'Customer';
                const prod = r.items?.[0]?.productName || humanize(r.reasonCode);
                return (
                  <option key={r.id} value={r.id}>
                    #{String(r.id).slice(0, 8)} — {name} ({prod}) [{r.status}]
                  </option>
                );
              })}
            </select>
          </div>

          {!isInternalNote && (
            <>
              {/* Channel Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Channel:
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'WHATSAPP', label: '💬 WhatsApp Direct' },
                    { key: 'SMS', label: '📱 Twilio SMS' },
                    { key: 'EMAIL', label: '✉ Official Email' },
                  ].map((ch) => (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => setSelectedChannel(ch.key)}
                      className={`flex-1 py-2 rounded-lg border font-semibold text-xs transition-all ${
                        selectedChannel === ch.key
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard Milestone Templates */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quick Milestone Templates:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MESSAGE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.key}
                      type="button"
                      onClick={() => {
                        setMessageBody(tmpl.text);
                        setSelectedChannel(tmpl.channel);
                      }}
                      className="p-2 border border-slate-200 rounded-lg text-left hover:border-primary/60 hover:bg-primary-50/30 transition-all group"
                    >
                      <p className="font-semibold text-slate-800 text-[11px] group-hover:text-primary">
                        {tmpl.label}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                        {tmpl.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Message Textarea */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isInternalNote ? 'Internal Agent Note Details:' : 'Customer Message Content:'}
            </label>
            <textarea
              rows={4}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder={
                isInternalNote
                  ? 'Enter internal notes for support team, QC auditors, or finance reviewers...'
                  : 'Enter message text to be delivered to customer...'
              }
              className="w-full p-2.5 border border-border rounded-lg bg-white text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDispatchModal(false)}
              disabled={dispatching}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDispatchNotice}
              disabled={dispatching}
            >
              {dispatching
                ? 'Dispatching…'
                : isInternalNote
                ? 'Save Case Note'
                : `Dispatch via ${humanize(selectedChannel)}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
