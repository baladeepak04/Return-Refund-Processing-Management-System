import Modal from '../ui/Modal';
import { TruckIcon, CheckCircleIcon, MapPinIcon, ShieldIcon } from '../ui/icons';

export default function TrackingModal({ isOpen, onClose, returnRequest, pickup }) {
  if (!isOpen || !returnRequest) return null;

  const awb = pickup?.awbNumber || `AWB${returnRequest.id.substring(0, 8).toUpperCase()}`;
  const partner = pickup?.logisticsPartner || 'SHIPROCKET';
  const status = returnRequest.status || 'INITIATED';

  // Determine active step index
  let activeStep = 0;
  if (status === 'PICKUP_SCHEDULED') activeStep = 1;
  else if (status === 'IN_TRANSIT' || pickup?.status === 'IN_TRANSIT') activeStep = 2;
  else if (status === 'RECEIVED' || pickup?.status === 'DELIVERED_TO_WAREHOUSE') activeStep = 3;
  else if (status === 'QC_DONE' || status === 'REFUND_INITIATED' || status === 'REFUNDED') activeStep = 4;

  const steps = [
    {
      title: 'Pickup Request Booked',
      desc: 'Reverse pickup order registered with carrier dispatch',
      time: 'Today, 09:15 AM',
      location: 'Dispatch Central'
    },
    {
      title: 'Out for Doorstep Pickup',
      desc: 'Courier Field Executive assigned: Rajesh Kumar (+91 98450 11223)',
      time: 'Today, 11:30 AM',
      location: 'Indiranagar Local Hub'
    },
    {
      title: 'Handed Over & In Transit',
      desc: 'Security OTP verified. Package scanned and en route to sorting hub',
      time: 'Today, 02:45 PM',
      location: 'Transit Sort Facility'
    },
    {
      title: 'Arrived at Central Warehouse Hub',
      desc: 'Inward gate scanning completed. GRN issued for technical QC inspection',
      time: 'Today, 05:20 PM',
      location: 'Peenya Central Dock 4'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Live Courier Transit Telemetry" size="lg">
      <div className="space-y-5">
        {/* Top Summary Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary text-white text-[11px] font-bold tracking-wider uppercase">
                {partner} EXPRESS
              </span>
              <span className="text-xs text-slate-300 font-mono">AWB: {awb}</span>
            </div>
            <h3 className="text-base font-bold mt-1 text-white">Reverse Shipment Status</h3>
            <p className="text-xs text-slate-300 mt-0.5">Destination: Peenya Central QC Facility, Bengaluru</p>
          </div>
          <div className="text-right sm:border-l sm:border-slate-700 sm:pl-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Current Status</span>
            <span className="font-bold text-sm text-primary-300 capitalize">
              {status.replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>
        </div>

        {/* Courier Driver & Vehicle Card */}
        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-sm">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-text">Rajesh Kumar (Field Logistics Agent)</div>
              <div className="text-text-muted text-[11px]">Vehicle: Bajaj Maxima Cargo (KA-04-AB-4921)</div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
              Verified Partner Driver
            </span>
          </div>
        </div>

        {/* Live Stepper Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
          {steps.map((step, idx) => {
            const isCompleted = idx <= activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div key={idx} className="relative flex items-start gap-4">
                {/* Node Circle */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                    isCompleted
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-transparent'
                  } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <h4 className={`text-xs font-bold ${isCompleted ? 'text-text' : 'text-text-muted'}`}>
                      {step.title}
                    </h4>
                    <span className="text-[11px] font-mono text-text-muted">{step.time}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">{step.desc}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-text-muted">
                    <MapPinIcon className="w-3 h-3 text-gray-400" />
                    <span>{step.location}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldIcon className="w-3.5 h-3.5 text-primary" />
            <span>End-to-end GPS reverse logistics tracking enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 text-text hover:bg-gray-200 rounded-md font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
