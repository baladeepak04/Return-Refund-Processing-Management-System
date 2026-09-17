import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { listOrders, listPolicies } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import { BoxIcon, SearchIcon, CheckIcon, AlertIcon, RefreshIcon } from '../../components/ui/icons.jsx';

export default function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [ordersRes, policiesRes] = await Promise.all([
          listOrders({ customerId: user?.id }),
          listPolicies(),
        ]);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
      } catch (err) {
        console.error('MyOrders load error:', err);
        setError('Unable to retrieve your orders at this time.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  function getPolicyForCategory(category) {
    return policies.find((p) => p.name.toLowerCase() === category.toLowerCase()) ||
      policies.find((p) => p.entityType === 'PLATFORM');
  }

  function handleInitiate(order, item, type = 'RETURN') {
    const policy = getPolicyForCategory(item.category);
    navigate('/customer/initiate-return', {
      state: {
        orderId: order.orderId,
        orderLineId: item.lineId,
        skuId: item.skuId,
        policyId: policy?.id || '',
        returnType: type,
        productName: item.productName,
        category: item.category,
        price: item.price,
      },
    });
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterCategory === 'ALL') return true;
    return order.items.some((i) => i.category.toUpperCase() === filterCategory);
  });

  if (loading) return <p className="text-sm text-text-secondary py-6 text-center">Loading customer orders…</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-border shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <BoxIcon className="w-5 h-5 text-primary" /> My Delivered Orders
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review your orders, check return windows and eligible categories, and initiate returns or exchanges.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by item or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-md w-56 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <SearchIcon className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-white text-text"
          >
            <option value="ALL">All Categories</option>
            <option value="ELECTRONICS">Electronics (7 Days)</option>
            <option value="APPAREL">Apparel (30 Days)</option>
            <option value="FOOD">Food (Non-Returnable)</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-danger bg-danger-50 rounded-md px-3 py-2">{error}</p>}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-border p-6">
          <BoxIcon className="w-12 h-12 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-text">No matching orders found</p>
          <p className="text-xs text-text-muted mt-1">Try clearing your search query or filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const deliveryDate = new Date(order.deliveryDate);
            const daysAgo = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div key={order.orderId} className="bg-white border border-border rounded-lg shadow-xs overflow-hidden">
                {/* Order Top Bar */}
                <div className="bg-gray-50 px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-text-muted block">Order ID</span>
                      <span className="font-mono font-semibold text-text">{order.orderId}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Delivered On</span>
                      <span className="font-medium text-text">
                        {deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <span className="text-text-muted ml-1">({daysAgo} day{daysAgo !== 1 ? 's' : ''} ago)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-success-800 bg-success-50 border border-success-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                      <CheckIcon className="w-3.5 h-3.5" /> Delivered
                    </span>
                    <span className="font-bold text-sm text-text">
                      ₹{Number(order.originalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items in Order */}
                <div className="divide-y divide-border p-5">
                  {order.items.map((item) => {
                    const policy = getPolicyForCategory(item.category);
                    const windowDays = policy ? policy.returnWindowDays : 30;
                    const isNonReturnable = windowDays === 0;
                    const isWindowOpen = !isNonReturnable && daysAgo <= windowDays;
                    const daysRemaining = windowDays - daysAgo;

                    return (
                      <div key={item.lineId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-lg border border-border shrink-0 bg-gray-100"
                          />
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-text">{item.productName}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                              <span>Qty: {item.quantity}</span>
                              <span>·</span>
                              <span>SKU: <code className="font-mono text-[11px] text-text-secondary">{String(item.skuId).slice(0, 12)}...</code></span>
                              <span>·</span>
                              <span className="font-semibold text-text">₹{Number(item.price).toLocaleString('en-IN')}</span>
                            </div>

                            {/* Eligibility Status */}
                            <div className="pt-1 flex items-center gap-2 text-xs">
                                {isNonReturnable ? (
                                  <span className="inline-flex items-center gap-1 text-danger font-medium">
                                    <AlertIcon className="w-3.5 h-3.5" /> Non-returnable item (Perishable Goods Policy)
                                  </span>
                              ) : isWindowOpen ? (
                                <span className="inline-flex items-center gap-1 text-success-700 font-medium">
                                  <CheckIcon className="w-3.5 h-3.5 text-success" /> Return window open ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left of {windowDays}d)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-text-muted">
                                  <AlertIcon className="w-3.5 h-3.5" /> Return window closed ({daysAgo} days &gt; {windowDays}d limit)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isWindowOpen ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInitiate(order, item, 'RETURN')}
                              >
                                Return Item
                              </Button>
                              {policy?.exchangeEligible && (
                                <Button
                                  size="sm"
                                  onClick={() => handleInitiate(order, item, 'EXCHANGE')}
                                >
                                  Exchange
                                </Button>
                              )}
                            </>
                          ) : isNonReturnable ? (
                            <span className="text-xs text-text-muted italic px-2 py-1 bg-gray-50 rounded">
                              Non-returnable item
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate('/customer/support-chat')}
                              className="text-xs"
                            >
                              Request Support Override
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
