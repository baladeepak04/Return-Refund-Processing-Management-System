// Canonical status and condition grade enums.

export const RETURN_STATUS = [
  'INITIATED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED',
  'QC_IN_PROGRESS', 'QC_DONE', 'REFUND_INITIATED', 'REFUNDED',
  'EXCHANGE_DISPATCHED', 'CLOSED', 'CANCELLED',
];

export const RETURN_TYPE = ['RETURN', 'EXCHANGE'];

export const PREFERRED_REFUND_METHOD = ['ORIGINAL', 'STORE_CREDIT', 'BANK_TRANSFER'];

export const PICKUP_STATUS = [
  'SCHEDULED', 'AGENT_ASSIGNED', 'PICKED_UP', 'FAILED', 'IN_TRANSIT', 'DELIVERED_TO_WAREHOUSE',
];

export const CONDITION_GRADE = ['MINT', 'GOOD', 'FAIR', 'DAMAGED', 'UNUSABLE'];

export const CONDITION_GRADE_LABEL = {
  MINT: 'Mint — resellable as new',
  GOOD: 'Good — resellable as refurb',
  FAIR: 'Fair — route to liquidation',
  DAMAGED: 'Damaged — route to disposal',
  UNUSABLE: 'Unusable — route to disposal',
};

export const FUNCTIONAL_TEST = ['PASS', 'FAIL', 'NA'];

export const DISPOSITION = ['RESTOCK_NEW', 'RESTOCK_REFURB', 'LIQUIDATE', 'RTM', 'DISPOSE'];

export const DISPOSITION_LABEL = {
  RESTOCK_NEW: 'Restock as new',
  RESTOCK_REFURB: 'Restock as refurbished',
  LIQUIDATE: 'Liquidate',
  RTM: 'Return to supplier (RTM)',
  DISPOSE: 'Dispose',
};

export const REFUND_STATUS = ['PENDING', 'INITIATED', 'PROCESSING', 'CREDITED', 'FAILED'];

export const REFUND_METHOD = ['ORIGINAL_METHOD', 'STORE_CREDIT', 'BANK_TRANSFER'];

export const FRAUD_FLAG_STATUS = ['OPEN', 'INVESTIGATING', 'CLEARED', 'CONFIRMED'];

export const RTM_BATCH_STATUS = ['ACCUMULATED', 'DISPATCHED', 'RECEIVED_BY_SUPPLIER', 'SETTLED'];

export const LIQUIDATION_STATUS = ['PREPARED', 'DISPATCHED', 'RECEIVED', 'SETTLED'];

export const RESTOCK_TYPE = ['NEW', 'REFURBISHED'];

export const POLICY_ENTITY_TYPE = ['PLATFORM', 'CATEGORY', 'SELLER'];

export const COMM_CHANNEL = ['SMS', 'EMAIL', 'WHATSAPP'];
export const COMM_STATUS = ['SENT', 'DELIVERED', 'FAILED'];

// Roles
export const ROLES = {
  CUSTOMER: 'customer',
  SUPPORT: 'customer_support',
  QC: 'warehouse_qc',
  FINANCE: 'finance',
  SUPPLIER: 'supplier_manager',
  ADMIN: 'admin',
};

export const ROLE_LABEL = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.SUPPORT]: 'Support Agent',
  [ROLES.QC]: 'QC Inspector',
  [ROLES.FINANCE]: 'Finance Manager',
  [ROLES.SUPPLIER]: 'Supplier Manager',
  [ROLES.ADMIN]: 'Administrator',
};

export const ROLE_PORTAL_PATH = {
  [ROLES.CUSTOMER]: '/customer',
  [ROLES.SUPPORT]: '/support',
  [ROLES.QC]: '/qc',
  [ROLES.FINANCE]: '/finance',
  [ROLES.SUPPLIER]: '/supplier',
  [ROLES.ADMIN]: '/admin',
};

// Badge color mapping shared by StatusBadge — keyed by raw enum value so every
// screen renders the same color for the same real status.
export const STATUS_COLOR = {
  // return_requests.status
  INITIATED: 'info', PICKUP_SCHEDULED: 'info', IN_TRANSIT: 'info',
  RECEIVED: 'info', QC_IN_PROGRESS: 'warning', QC_DONE: 'success',
  REFUND_INITIATED: 'warning', REFUNDED: 'success', EXCHANGE_DISPATCHED: 'success',
  CLOSED: 'muted', CANCELLED: 'muted',
  // refunds.status
  PENDING: 'warning', PROCESSING: 'info', CREDITED: 'success', FAILED: 'danger',
  // pickups.status
  SCHEDULED: 'info', AGENT_ASSIGNED: 'info', PICKED_UP: 'success', DELIVERED_TO_WAREHOUSE: 'success',
  // fraud_flags.status
  OPEN: 'danger', INVESTIGATING: 'warning', CLEARED: 'success', CONFIRMED: 'danger',
  // rtm_batches.status
  ACCUMULATED: 'warning', DISPATCHED: 'info', RECEIVED_BY_SUPPLIER: 'info', SETTLED: 'success',
  // condition_grade
  MINT: 'success', GOOD: 'info', FAIR: 'warning', DAMAGED: 'danger', UNUSABLE: 'danger',
  // generic
  active: 'success', inactive: 'muted',
};

export function humanize(value) {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
