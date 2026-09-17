import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rrpms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err.config?.url || '';
      // Don't log out the user on optional background notification polling
      if (!url.includes('/communications')) {
        localStorage.removeItem('rrpms_token');
        localStorage.removeItem('rrpms_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

// --- Return and Pickup APIs ---
export const initiateReturn = (payload) => api.post('/returns', payload);
export const setPreferredChannel = (channel) => api.put('/users/me/preferred-channel', null, { params: { channel } });
export const saveReturnDraft = (payload) => api.post('/returns/draft', payload);
export const listReturnDrafts = (customerId) => api.get('/returns/drafts', { params: { customerId } });
export const finalizeReturnDraft = (id) => api.put(`/returns/${id}/finalize`);
export const getReturn = (id) => api.get(`/returns/${id}`);
export const schedulePickup = (id, payload) => api.post(`/returns/${id}/pickup`, payload);
export const reschedulePickup = (id, payload) => api.put(`/returns/${id}/pickup/reschedule`, payload);
export const markPickedUp = (id) => api.put(`/returns/${id}/pickup/picked-up`);
export const markInTransit = (id) => api.put(`/returns/${id}/pickup/in-transit`);
export const markDeliveredToWarehouse = (id) => api.put(`/returns/${id}/pickup/delivered`);
export const markPickupFailed = (id) => api.put(`/returns/${id}/pickup/failed`);
export const getReturnPolicies = (orderId) => api.get('/returns/policies', { params: { orderId } });
export const listReturns = (params) => api.get('/returns', { params });
export const listOverrides = () => api.get('/returns/overrides');

// --- QC and Refund APIs ---
export const submitQcInspection = (payload) => api.post('/qc', payload);
export const initiateRefund = (payload) => api.post('/refunds', payload);
export const getRefund = (id) => api.get(`/refunds/${id}`);
export const listRefunds = (params) => api.get('/refunds', { params });
export const markRefundCredited = (id) => api.put(`/refunds/${id}/credited`);
export const cancelReturn = (id) => api.put(`/returns/${id}/cancel`);
export const getFraudQueue = () => api.get('/returns/fraud-queue');

// --- Analytics and Supplier APIs ---
export const getReturnAnalytics = (params) => api.get('/analytics/returns', { params });
export const getRefundTatReport = (params) => api.get('/analytics/refund-tat', { params });
export const createRtmBatch = (payload) => api.post('/rtm', payload);
export const getQcAnalytics = (params) => api.get('/analytics/qc', { params });
export const getFraudAnalytics = (params) => api.get('/analytics/fraud', { params });
export const getSatisfactionAnalytics = () => api.get('/analytics/satisfaction');
export const getLiquidationAnalytics = () => api.get('/analytics/liquidation');
export const getSupplierRtmSummary = () => api.get('/analytics/supplier-rtm');

// --- Orders API ---
export const listOrders = (params) => api.get('/orders', { params });
export const getOrder = (orderId) => api.get(`/orders/${orderId}`);

// --- Policy Engine ---
export const listPolicies = () => api.get('/policies');
export const createPolicy = (payload) => api.post('/policies', payload);
export const updatePolicy = (id, payload) => api.put(`/policies/${id}`, payload);
export const deletePolicy = (id) => api.delete(`/policies/${id}`);

// --- Auth ---
export const login = (payload) => api.post('/auth/login', payload);
export const register = (payload) => api.post('/auth/register', payload);

// --- Admin: user management ---
export const listUsers = () => api.get('/admin/users');
export const createUser = (payload) => api.post('/admin/users', payload);
export const updateUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const disableUser = (id) => api.put(`/admin/users/${id}/disable`);
export const enableUser = (id) => api.put(`/admin/users/${id}/enable`);

// --- Fraud queue actions ---
export const blacklistFraudFlag = (id) => api.put(`/fraud/${id}/blacklist`);
export const investigateFraudFlag = (id) => api.put(`/fraud/${id}/investigate`);
export const clearFraudFlag = (id) => api.put(`/fraud/${id}/clear`);

// --- RTM ---
export const listRtmBatches = () => api.get('/rtm');
export const listSupplierReturns = () => api.get('/supplier-returns');
export const dispatchRtmBatch = (id) => api.put(`/rtm/${id}/dispatch`);
export const markRtmBatchReceived = (id) => api.put(`/rtm/${id}/received`);
export const settleRtmBatch = (id) => api.put(`/rtm/${id}/settle`);
export const disputeRtmBatch = (id, notes) => api.put(`/rtm/${id}/dispute`, null, { params: { notes } });
export const resolveRtmBatchDispute = (id) => api.put(`/rtm/${id}/resolve-dispute`);

// --- Refund actions ---
export const approveRefund = (id) => api.put(`/refunds/${id}/approve`);
export const rejectRefund = (id, reason) => api.put(`/refunds/${id}/reject`, { reason });

// --- Communications ---
export const listCommunications = (params) => api.get('/communications', { params });

// --- QC ---
export const listQcInspections = (params) => api.get('/qc', { params });

// --- Exchange ---
export const dispatchExchange = (returnId) => api.put(`/returns/${returnId}/exchange/dispatch`);
export const submitSatisfaction = (returnId, payload) => api.put(`/returns/${returnId}/satisfaction`, payload);
export const submitSatisfactionFeedback = submitSatisfaction;

// --- Restocking and Liquidation ---
export const listRestockedItems = () => api.get('/restock');
export const listLiquidationBatches = () => api.get('/liquidation');
export const settleLiquidationBatch = (id, payoutAmount) => api.put(`/liquidation/${id}/settle`, { payoutAmount });

export default api;
