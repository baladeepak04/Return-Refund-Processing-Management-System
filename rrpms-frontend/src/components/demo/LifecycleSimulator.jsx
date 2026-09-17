import { useState } from 'react';
import {
  initiateReturn,
  schedulePickup,
  markPickedUp,
  markInTransit,
  markDeliveredToWarehouse,
  submitQcInspection,
  initiateRefund,
  markRefundCredited,
  listRefunds,
  listOrders,
  listPolicies,
  listReturns,
  submitSatisfactionFeedback
} from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../lib/ToastContext';
import { PlayIcon, CheckCircleIcon, RefreshIcon } from '../ui/icons';

export default function LifecycleSimulator({ onCompleted }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [activeReturnId, setActiveReturnId] = useState(null);

  const steps = [
    { name: 'Order & Policy Match', desc: 'Validating delivered line items and category eligibility' },
    { name: 'Return Request', desc: 'Initiating return request and refund preference capture' },
    { name: 'Carrier Dispatch', desc: 'Automated carrier dispatch and tracking AWB generation' },
    { name: 'In-Transit & Inwarding', desc: 'Carrier pickup handover and warehouse dock inwarding' },
    { name: 'Warehouse QC Inspection', desc: 'Optical defect verification and inventory restock grading' },
    { name: 'Settlement & CSAT', desc: 'Instant refund disbursement and customer NPS rating' }
  ];

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const runSimulation = async () => {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setCurrentStep(1);

    try {
      addLog('Step 1: Discovering customer orders and return policies…');
      const [ordersRes, policiesRes, returnsRes] = await Promise.all([
        listOrders(),
        listPolicies(),
        listReturns().catch(() => ({ data: [] }))
      ]);
      const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []);
      const policies = Array.isArray(policiesRes?.data) ? policiesRes.data : (Array.isArray(policiesRes) ? policiesRes : []);
      const existingReturns = Array.isArray(returnsRes?.data) ? returnsRes.data : [];
      const returnedLineIds = new Set(
        existingReturns.flatMap((r) => (r.items || []).map((i) => i.orderLineId))
      );

      // Find an order & item that does not yet have an active return
      let targetOrder = null;
      let targetItem = null;
      for (const ord of orders) {
        for (const itm of (ord.items || [])) {
          if (!returnedLineIds.has(itm.lineId)) {
            targetOrder = ord;
            targetItem = itm;
            break;
          }
        }
        if (targetOrder) break;
      }

      // Generate a clean UUID if all sample orders have returns
      const uuidv4 = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const simOrderId = targetOrder?.orderId || targetOrder?.id || uuidv4();
      const simLineId = targetItem?.lineId || uuidv4();
      const simSkuId = targetItem?.skuId || uuidv4();
      const simPrice = Number(targetItem?.price || 4999);

      const targetPolicy = policies.find((p) => p.name === 'Electronics') || policies[0] || { id: '3456789a-bcde-4f01-2345-6789abcdef01' };

      await new Promise((r) => setTimeout(r, 1000));
      setCurrentStep(2);
      addLog(`Step 2: Customer initiating return for order ${String(simOrderId).substring(0, 8)}…`);

      const returnReq = await initiateReturn({
        orderId: simOrderId,
        customerId: user?.id || '89ab0c68-6045-4074-8374-e36d643087af',
        returnType: 'RETURN',
        reasonCode: 'SIZE_FIT_ISSUE',
        preferredRefundMethod: 'STORE_CREDIT',
        policyId: targetPolicy.id,
        items: [
          {
            orderLineId: simLineId,
            skuId: simSkuId,
            quantity: 1,
            returnReason: 'SIZE_FIT_ISSUE'
          }
        ]
      });

      const retData = returnReq?.data || returnReq;
      const retId = retData.id;
      setActiveReturnId(retId);
      addLog(`Return created: ID ${String(retId).substring(0, 13)}… (Status: INITIATED)`);

      await new Promise((r) => setTimeout(r, 1200));
      setCurrentStep(3);
      addLog('Step 3: Scheduling doorstep courier pickup via Shiprocket…');

      const pickupRes = await schedulePickup(retId, {
        logisticsPartner: 'SHIPROCKET',
        pickupDate: new Date().toISOString().split('T')[0],
        pickupSlot: '10:00 - 14:00',
        pickupAddress: 'Flat 402, Prestige Palms, Indiranagar, Bengaluru - 560038'
      });
      const pickupData = pickupRes?.data || pickupRes;
      addLog(`Pickup scheduled! Carrier AWB: ${pickupData.awbNumber || 'SR-829140'} | OTP: ${pickupData.pickupOtp || '4829'}`);

      await new Promise((r) => setTimeout(r, 1200));
      setCurrentStep(4);
      addLog('Step 4: Driver verifying OTP, picking up parcel, and transit to hub…');

      await markPickedUp(retId);
      await markInTransit(retId);
      await markDeliveredToWarehouse(retId);
      addLog('Item inwarded at Peenya Central Warehouse. Status: DELIVERED_TO_WAREHOUSE');

      await new Promise((r) => setTimeout(r, 1200));
      setCurrentStep(5);
      addLog('Step 5: Warehouse QC inspection with defect photo and grading…');

      const qcRes = await submitQcInspection({
        returnId: retId,
        conditionGrade: 'MINT',
        functionalTest: 'PASS',
        complaintValidated: true,
        disposition: 'RESTOCK_NEW',
        notes: 'Item in pristine condition. Approved for inventory restock.',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e']
      });
      const qcData = qcRes?.data || qcRes;
      addLog(`QC inspection saved! Grade: ${qcData.conditionGrade || 'MINT'} ➔ Restock triggered.`);

      await new Promise((r) => setTimeout(r, 1200));
      setCurrentStep(6);
      addLog('Step 6: Executing automated refund settlement & 10/10 CSAT feedback…');

      // Check if QC auto-created refund record or initiate a new one
      let refundId;
      try {
        const refListRes = await listRefunds({ returnId: retId }).catch(() => ({ data: [] }));
        const existingList = Array.isArray(refListRes?.data) ? refListRes.data : [];
        const match = existingList.find((r) => r.returnRequest?.id === retId || r.returnId === retId);
        if (match) {
          refundId = match.id;
        }
      } catch (_) {}

      if (!refundId) {
        const refundRes = await initiateRefund({
          returnId: retId,
          amount: simPrice,
          method: 'STORE_CREDIT'
        });
        const refundData = refundRes?.data || refundRes;
        refundId = refundData.id;
      }

      await markRefundCredited(refundId);
      addLog(`Refund credited: ₹${simPrice.toLocaleString('en-IN')}.00 via Store Credit (+5% bonus).`);

      await submitSatisfactionFeedback(retId, {
        rating: 10,
        comment: 'Lightning fast return and instant store credit! 10/10.'
      });
      addLog('Customer rated return experience: 10/10 NPS recorded.');

      await new Promise(r => setTimeout(r, 800));
      setCurrentStep(7);
      addToast('End-to-End Reverse Logistics Demo completed successfully!', 'success', 'Demo Completed');
      if (onCompleted) onCompleted(retId);
    } catch (err) {
      addLog(`Error during simulation: ${err?.response?.data?.detail || err.message}`);
      addToast(`Simulator error: ${err?.response?.data?.detail || err?.message}`, 'warning', 'Simulation Failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-5 shadow-lg border border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase tracking-wider font-bold border border-emerald-500/30">
              Pipeline Automation
            </span>
            <span className="text-xs text-slate-400">End-to-End Reverse Logistics Orchestration</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Automated Reverse Logistics Pipeline</h3>
          <p className="text-xs text-slate-300 max-w-xl mt-0.5">
            Orchestrates the entire reverse logistics journey with live database transactions, carrier dispatch, warehouse grading, and automated instant settlement.
          </p>
        </div>

        <button
          onClick={runSimulation}
          disabled={running}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${
            running
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95'
          }`}
        >
          {running ? (
            <>
              <RefreshIcon className="w-4 h-4 animate-spin" />
              Running Pipeline ({currentStep}/6)…
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4 fill-current" />
              Execute Automated Pipeline
            </>
          )}
        </button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 my-4">
        {steps.map((st, i) => {
          const stepNum = i + 1;
          const isDone = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div
              key={i}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                isDone
                  ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                  : isCurrent
                  ? 'bg-primary-950/60 border-primary-500 ring-2 ring-primary-500/50 text-white animate-pulse'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span>Stage 0{stepNum}</span>
                {isDone && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs font-semibold leading-snug">{st.name}</div>
            </div>
          );
        })}
      </div>

      {/* Live Log Console */}
      {logs.length > 0 && (
        <div className="bg-slate-950/90 rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto border border-slate-800 space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-emerald-400">❯</span> {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
