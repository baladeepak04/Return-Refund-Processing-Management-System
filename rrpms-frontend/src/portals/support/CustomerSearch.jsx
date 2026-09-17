import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { listReturns, listUsers } from '../../lib/api.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import { SearchIcon, UsersIcon, ClockIcon } from '../../components/ui/icons.jsx';

function getInitials(name) {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CustomerSearch() {
  const [returns, setReturns] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [retRes, usersRes] = await Promise.all([
        listReturns(),
        listUsers().catch((err) => {
          console.warn('Could not fetch user directory, using return metadata fallback:', err);
          return { data: [] };
        }),
      ]);
      setReturns(Array.isArray(retRes.data) ? retRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (e) {
      console.error('support CustomerSearch error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve customer directory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const customers = useMemo(() => {
    const userMap = new Map();
    users.forEach((u) => {
      if (u.id) userMap.set(String(u.id).toLowerCase(), u);
    });

    const byCustomer = {};

    returns.forEach((r) => {
      if (!r.customerId) return;
      const cid = String(r.customerId).toLowerCase();
      if (!byCustomer[cid]) {
        const u = userMap.get(cid);
        byCustomer[cid] = {
          customerId: r.customerId,
          name: u?.name || r.customerName || `Customer ${r.customerId.slice(0, 8)}`,
          email: u?.email || r.customerEmail || '—',
          isVip: u?.isVip || false,
          preferredChannel: u?.preferredChannel || 'SMS',
          returnCount: 0,
          latest: r.initiatedAt,
          latestStatus: r.status,
          latestReason: r.reasonCode,
        };
      }
      byCustomer[cid].returnCount += 1;
      if (r.initiatedAt && (!byCustomer[cid].latest || r.initiatedAt > byCustomer[cid].latest)) {
        byCustomer[cid].latest = r.initiatedAt;
        byCustomer[cid].latestStatus = r.status;
        byCustomer[cid].latestReason = r.reasonCode;
      }
    });

    // Also include any customer-role users that might not have filed a return yet
    users.forEach((u) => {
      if (u.role === 'CUSTOMER') {
        const cid = String(u.id).toLowerCase();
        if (!byCustomer[cid]) {
          byCustomer[cid] = {
            customerId: u.id,
            name: u.name,
            email: u.email,
            isVip: u.isVip || false,
            preferredChannel: u.preferredChannel || 'SMS',
            returnCount: 0,
            latest: null,
            latestStatus: null,
            latestReason: null,
          };
        }
      }
    });

    const list = Object.values(byCustomer).sort((a, b) => {
      if (b.returnCount !== a.returnCount) return b.returnCount - a.returnCount;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((c) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      String(c.customerId).toLowerCase().includes(q)
    );
  }, [returns, users, query]);

  return (
    <div className="max-w-4xl bg-surface border border-border rounded-xl p-6 shadow-xs space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UsersIcon className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-text text-lg">Customer Directory & Search</h2>
        </div>
        <p className="text-xs text-text-muted">
          Lookup customer accounts by name, email, or ID to view complete reverse logistics histories and manage requests on their behalf.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
          <SearchIcon className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by customer name (e.g. Priya Sharma, Aarav Patel), email, or ID..."
          className="w-full border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text px-1"
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="py-8 text-center animate-pulse">
          <p className="text-xs text-text-muted">Loading customer records from platform database…</p>
        </div>
      )}

      {error && (
        <div className="bg-surface rounded-xl border border-danger-200 p-4 shadow-xs flex items-center justify-between">
          <p className="text-sm font-medium text-danger">{error}</p>
          <Button size="sm" onClick={loadData}>Retry</Button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>Found <strong>{customers.length}</strong> customer{customers.length !== 1 ? 's' : ''}</span>
            {query && <span>Filtering by: &quot;{query}&quot;</span>}
          </div>

          {customers.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-border rounded-xl p-8 text-center text-text-muted text-sm">
              No customer records found matching &quot;{query}&quot;.
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-white shadow-xs">
              {customers.map((c) => {
                const initials = getInitials(c.name);
                const colorClass = getAvatarColor(c.name);

                return (
                  <div
                    key={c.customerId}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-11 h-11 rounded-full ${colorClass} font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs`}>
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-text truncate">
                            {c.name}
                          </h3>
                          {c.isVip && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                              VIP Customer
                            </span>
                          )}
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {c.preferredChannel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 flex-wrap">
                          <span className="font-medium text-slate-700">{c.email}</span>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-slate-400" title={c.customerId}>
                            ID: {String(c.customerId).slice(0, 8)}…
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-primary">
                            {c.returnCount} Total Return{c.returnCount !== 1 ? 's' : ''}
                          </span>
                          {c.latest && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <ClockIcon className="w-3 h-3" />
                                Latest: {new Date(c.latest).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {c.latestStatus && <StatusBadge value={c.latestStatus} />}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/support/initiate-on-behalf?customerId=${c.customerId}&customerName=${encodeURIComponent(c.name)}`)}
                        >
                          + New Return
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/support/customer-history?customerId=${c.customerId}&customerName=${encodeURIComponent(c.name)}&customerEmail=${encodeURIComponent(c.email)}`)}
                        >
                          History →
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
