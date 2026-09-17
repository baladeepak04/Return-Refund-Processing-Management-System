// Seed data for local development and demonstration.

export const returns = [
  { id: 'RTN-2847', product: 'Nike Air Max 270', customer: 'Priya Sharma', initiated: '2026-07-05', reason: 'Product is damaged', status: 'QC_IN_PROGRESS', refundMethod: 'ORIGINAL', amount: 8499 },
  { id: 'RTN-2841', product: 'Boat Airdopes 141', customer: 'Amit Kumar', initiated: '2026-07-02', reason: 'Wrong item', status: 'REFUNDED', refundMethod: 'BANK_TRANSFER', amount: 2299 },
  { id: 'RTN-2835', product: 'Samsung Galaxy Buds2', customer: 'Sneha Patel', initiated: '2026-06-30', reason: 'Size issue', status: 'PICKUP_SCHEDULED', refundMethod: 'BANK_TRANSFER', amount: 5999 },
  { id: 'RTN-2822', product: 'Logitech MX Master 3', customer: 'Vikas Mehta', initiated: '2026-06-25', reason: 'Defective product', status: 'QC_DONE', refundMethod: 'STORE_CREDIT', amount: 9495 },
  { id: 'RTN-2810', product: 'Bose QuietComfort 45', customer: 'Kiran Rao', initiated: '2026-06-18', reason: 'Not as described', status: 'CANCELLED', refundMethod: 'ORIGINAL', amount: 29990 },
];

export const qcInspections = [
  { id: 'QC-1021', returnId: 'RTN-2847', product: 'Nike Air Max 270', customer: 'Priya Sharma', receivedAt: '2026-07-07T09:45:00', conditionGrade: null, disposition: null, priority: 'high' },
  { id: 'QC-1020', returnId: 'RTN-2840', product: 'OnePlus Buds Pro', customer: 'Raj Kumar', receivedAt: '2026-07-07T08:30:00', conditionGrade: null, disposition: null, priority: 'medium' },
  { id: 'QC-1019', returnId: 'RTN-2838', product: 'Logitech G Pro X', customer: 'Ananya Sen', receivedAt: '2026-07-06T17:00:00', conditionGrade: null, disposition: null, priority: 'low' },
  { id: 'QC-1018', returnId: 'RTN-2835', product: 'Samsung Galaxy Buds2', customer: 'Sneha Patel', receivedAt: '2026-07-06T14:15:00', conditionGrade: null, disposition: null, priority: 'medium' },
];

export const qcHistory = [
  { id: 'QC-1020', returnId: 'RTN-2841', product: 'Boat Airdopes 141', inspector: 'Deepak Nair', date: '2026-07-07', conditionGrade: 'MINT', disposition: 'RESTOCK_NEW', outcome: 'success' },
  { id: 'QC-1019', returnId: 'RTN-2838', product: 'Logitech G Pro X', inspector: 'Deepak Nair', date: '2026-07-06', conditionGrade: 'FAIR', disposition: 'RESTOCK_REFURB', outcome: 'success' },
  { id: 'QC-1018', returnId: 'RTN-2835', product: 'Samsung Galaxy Buds2', inspector: 'Meera Rao', date: '2026-07-06', conditionGrade: 'UNUSABLE', disposition: 'LIQUIDATE', outcome: 'rejected' },
  { id: 'QC-1015', returnId: 'RTN-2830', product: 'Apple Watch SE', inspector: 'Deepak Nair', date: '2026-07-05', conditionGrade: 'GOOD', disposition: 'RESTOCK_NEW', outcome: 'success' },
  { id: 'QC-1012', returnId: 'RTN-2825', product: 'Sony WH-1000XM5', inspector: 'Meera Rao', date: '2026-07-04', conditionGrade: 'MINT', disposition: 'RESTOCK_NEW', outcome: 'success' },
];

export const refundQueue = [
  { id: 'REF-5521', returnId: 'RTN-2847', customer: 'Priya Sharma', product: 'Nike Air Max 270', amount: 8499, method: 'ORIGINAL_METHOD', conditionGrade: 'MINT', status: 'PENDING', submitted: '2026-07-07' },
  { id: 'REF-5520', returnId: 'RTN-2845', customer: 'Vikas Mehta', product: 'iPhone 15 Pro', amount: 124900, method: 'BANK_TRANSFER', conditionGrade: 'GOOD', status: 'PENDING', submitted: '2026-07-06' },
  { id: 'REF-5519', returnId: 'RTN-2844', customer: 'Kiran Rao', product: 'Bose QC 45', amount: 29990, method: 'STORE_CREDIT', conditionGrade: 'MINT', status: 'INITIATED', submitted: '2026-07-06' },
  { id: 'REF-5518', returnId: 'RTN-2843', customer: 'Meena Gupta', product: 'Dell XPS 15', amount: 89990, method: 'BANK_TRANSFER', conditionGrade: 'FAIR', status: 'PENDING', submitted: '2026-07-05' },
  { id: 'REF-5515', returnId: 'RTN-2840', customer: 'Ananya Sen', product: 'Sony OLED TV', amount: 189990, method: 'BANK_TRANSFER', conditionGrade: 'GOOD', status: 'PENDING', submitted: '2026-07-05' },
];

export const supplierReturns = [
  { id: 'SR-1042', supplier: 'Nike India', product: 'Air Max 270', qty: 1, value: 4200, conditionGrade: 'GOOD', disposition: 'RTM', status: 'ACCUMULATED' },
  { id: 'SR-1041', supplier: 'Samsung India', product: 'Galaxy Buds2', qty: 1, value: 2800, conditionGrade: 'FAIR', disposition: 'LIQUIDATE', status: 'DISPATCHED' },
  { id: 'SR-1040', supplier: 'Apple India', product: 'iPhone 15 Pro', qty: 1, value: 62000, conditionGrade: 'MINT', disposition: 'RTM', status: 'ACCUMULATED' },
  { id: 'SR-1039', supplier: "Levi's India", product: '512 Slim Taper Jeans', qty: 2, value: 7600, conditionGrade: 'MINT', disposition: 'RTM', status: 'DISPATCHED' },
];

export const rtmBatches = [
  { id: 'RTM-204', supplier: 'Nike India', items: 42, value: 384300, dispatchDate: '2026-07-03', status: 'ACCUMULATED' },
  { id: 'RTM-203', supplier: 'Samsung India', items: 18, value: 194800, dispatchDate: '2026-07-01', status: 'DISPATCHED' },
  { id: 'RTM-202', supplier: 'Apple India', items: 9, value: 91200, dispatchDate: '2026-06-28', status: 'RECEIVED_BY_SUPPLIER' },
];

export const fraudQueue = [
  { id: 'FR-401', customer: 'Ravi Desai', custId: 'CUST-0821', returns: 18, returnRate: 82, riskScore: 92, pattern: 'Repeat fraud pattern', flaggedAt: '2026-07-07', status: 'OPEN' },
  { id: 'FR-400', customer: 'Seema Joshi', custId: 'CUST-0745', returns: 12, returnRate: 71, riskScore: 78, pattern: 'High value item abuse', flaggedAt: '2026-07-06', status: 'INVESTIGATING' },
  { id: 'FR-399', customer: 'Mohit Sharma', custId: 'CUST-0632', returns: 9, returnRate: 68, riskScore: 74, pattern: 'Consecutive returns', flaggedAt: '2026-07-05', status: 'INVESTIGATING' },
  { id: 'FR-397', customer: 'Pradeep Nair', custId: 'CUST-0511', returns: 7, returnRate: 58, riskScore: 61, pattern: 'Empty box claims', flaggedAt: '2026-07-04', status: 'OPEN' },
  { id: 'FR-395', customer: 'Anita Roy', custId: 'CUST-0398', returns: 5, returnRate: 52, riskScore: 55, pattern: 'Wardrobing pattern', flaggedAt: '2026-07-03', status: 'OPEN' },
];

export const returnPolicies = [
  { id: 'POL-1', name: 'Electronics Standard', entityType: 'CATEGORY', category: 'Electronics', returnWindowDays: 7, freeReturn: false, refundType: 'Original Payment', nonReturnableNote: '', conditions: 'Original packaging required, must be functional', active: true },
  { id: 'POL-2', name: 'Apparel & Footwear', entityType: 'CATEGORY', category: 'Clothing', returnWindowDays: 15, freeReturn: true, refundType: 'Original or Store Credit', nonReturnableNote: '', conditions: 'Unused with tags intact', active: true },
  { id: 'POL-3', name: 'Furniture & Large Items', entityType: 'CATEGORY', category: 'Furniture', returnWindowDays: 0, freeReturn: false, refundType: 'Replacement only', nonReturnableNote: 'Not eligible for return', conditions: 'No returns unless defective', active: true },
  { id: 'POL-4', name: 'Small Appliances', entityType: 'CATEGORY', category: 'Appliances', returnWindowDays: 10, freeReturn: false, refundType: 'Original Payment', nonReturnableNote: '', conditions: 'Original accessories required', active: true },
  { id: 'POL-5', name: 'Books & Media', entityType: 'CATEGORY', category: 'Books', returnWindowDays: 3, freeReturn: false, refundType: 'Store Credit', nonReturnableNote: '', conditions: 'Unopened only', active: false },
];

export const users = [
  { id: 'u1', name: 'Rahul Verma', email: 'rahul.support@returnflow.io', role: 'customer_support', department: 'Customer Support', status: 'active', lastLogin: '2026-07-07' },
  { id: 'u2', name: 'Deepak Nair', email: 'deepak.qc@returnflow.io', role: 'warehouse_qc', department: 'Warehouse', status: 'active', lastLogin: '2026-07-07' },
  { id: 'u3', name: 'Kavita Iyer', email: 'kavita.finance@returnflow.io', role: 'finance', department: 'Finance', status: 'active', lastLogin: '2026-07-06' },
  { id: 'u4', name: 'Sunita Reddy', email: 'sunita.supplier@returnflow.io', role: 'supplier_manager', department: 'Operations', status: 'active', lastLogin: '2026-07-05' },
  { id: 'u5', name: 'Meera Rao', email: 'meera.qc@returnflow.io', role: 'warehouse_qc', department: 'Warehouse', status: 'inactive', lastLogin: '2026-07-01' },
];

export const supportCases = [
  { id: 'CASE-4821', customer: 'Priya Sharma', status: 'INVESTIGATING', summary: 'Refund not received after 10 days', age: '2h ago' },
  { id: 'CASE-4817', customer: 'Amit Kumar', status: 'OPEN', summary: 'Pickup not scheduled after return initiated', age: '4h ago' },
  { id: 'CASE-4815', customer: 'Sneha Patel', status: 'OPEN', summary: 'Wrong item received, need exchange', age: '5h ago' },
  { id: 'CASE-4810', customer: 'Rajesh Singh', status: 'INVESTIGATING', summary: 'QC rejected but product was fine', age: '1d ago' },
];

export const monthlyRefundVolume = [
  { month: 'Feb', value: 32 }, { month: 'Mar', value: 33 }, { month: 'Apr', value: 30 },
  { month: 'May', value: 38 }, { month: 'Jun', value: 41 }, { month: 'Jul', value: 42 },
];

export const refundByMethod = [
  { method: 'UPI', value: 43 }, { method: 'Bank Transfer', value: 29 },
  { method: 'Store Credit', value: 19 }, { method: 'COD Cash', value: 9 },
];

export const topReturnReasons = [
  { reason: 'Damaged', value: 340 }, { reason: 'Wrong Item', value: 290 },
  { reason: 'Size', value: 250 }, { reason: 'Not as Described', value: 220 },
  { reason: 'Changed Mind', value: 170 }, { reason: 'Defective', value: 140 },
];

export const qcDispositionBreakdown = [
  { name: 'Restocked', value: 48, disposition: 'RESTOCK_NEW' },
  { name: 'Refurbished', value: 22, disposition: 'RESTOCK_REFURB' },
  { name: 'Liquidated', value: 18, disposition: 'LIQUIDATE' },
  { name: 'Disposed', value: 7, disposition: 'DISPOSE' },
  { name: 'Supplier RTM', value: 5, disposition: 'RTM' },
];

export const DEMO_USERS = [
  { role: 'customer', name: 'Priya Sharma', email: 'priya@example.com' },
  { role: 'customer_support', name: 'Rahul Verma', email: 'rahul.support@returnflow.io' },
  { role: 'warehouse_qc', name: 'Deepak Nair', email: 'deepak.qc@returnflow.io' },
  { role: 'finance', name: 'Kavita Iyer', email: 'kavita.finance@returnflow.io' },
  { role: 'supplier_manager', name: 'Sunita Reddy', email: 'sunita.supplier@returnflow.io' },
  { role: 'admin', name: 'Arjun Mehta', email: 'admin@returnflow.io' },
];
