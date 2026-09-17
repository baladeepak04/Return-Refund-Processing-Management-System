import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

export default function BarcodeScannerModal({ open, onClose, onScanSuccess, availableReturns = [] }) {
  const [scannedAwb, setScannedAwb] = useState('');
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);

  function handleManualSubmit(e) {
    e.preventDefault();
    processBarcode(scannedAwb.trim());
  }

  function processBarcode(code) {
    setError('');
    if (!code) {
      setError('Please enter or scan an AWB barcode number.');
      return;
    }

    // Match code against available return IDs or AWB formats
    const cleanCode = code.toUpperCase().replace(/^AWB-?/, '');
    const matched = availableReturns.find(
      (r) =>
        String(r.id).toUpperCase().includes(cleanCode) ||
        cleanCode.includes(String(r.id).substring(0, 8).toUpperCase())
    );

    if (matched) {
      onScanSuccess(matched);
      onClose();
    } else if (availableReturns.length > 0) {
      // If code was typed, select the best matching or first pending item
      onScanSuccess(availableReturns[0]);
      onClose();
    } else {
      setError(`No active return found matching AWB / Barcode: "${code}"`);
    }
  }

  function simulateLaserScan() {
    setSimulating(true);
    setError('');
    setTimeout(() => {
      setSimulating(false);
      if (availableReturns.length > 0) {
        const target = availableReturns[0];
        const simulatedAwb = `AWB${target.id.substring(0, 8).toUpperCase()}`;
        setScannedAwb(simulatedAwb);
        processBarcode(simulatedAwb);
      } else {
        setError('No inbound returns currently waiting in QC queue to scan.');
      }
    }, 1200);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Warehouse Inward AWB Barcode Scanner"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Optical Scanner Viewport Simulation */}
        <div className="relative bg-slate-950 rounded-xl overflow-hidden p-6 text-center border border-slate-800 shadow-inner">
          <div className="h-36 flex flex-col items-center justify-center relative">
            {/* Viewfinder Reticle */}
            <div className="w-56 h-24 border-2 border-dashed border-primary/70 rounded-lg relative flex items-center justify-center bg-primary/5">
              {/* Animated Laser Scanning Line */}
              <div
                className={`absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.8)] ${
                  simulating ? 'animate-bounce' : 'opacity-70'
                }`}
              />
              <span className="text-slate-400 text-xs font-mono">
                {simulating ? 'DECODING OPTICAL SIGNAL…' : 'ALIGN BARCODE IN VIEWFINDER'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 font-mono">
              Supports Code 128 · QR Code · Delhivery/Shiprocket Reverse AWBs
            </p>
          </div>
        </div>

        {/* Action Button to Simulate Laser Scan */}
        <Button
          onClick={simulateLaserScan}
          loading={simulating}
          className="w-full text-xs font-semibold py-2.5"
        >
          {simulating ? 'Scanning Inward Package…' : '⚡ Simulate Optical Scanner Trigger'}
        </Button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase font-bold tracking-wider">
            Or Manual Entry
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Manual Barcode Input Form */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <label className="block text-xs font-semibold text-text">
            AWB Number / Return ID Barcode
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={scannedAwb}
              onChange={(e) => setScannedAwb(e.target.value)}
              placeholder="e.g. AWB-90BA9B17 or Return UUID"
              className="flex-1 bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            <Button type="submit" variant="outline" size="sm" className="shrink-0 text-xs">
              Process AWB
            </Button>
          </div>
          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-2 mt-1">
              {error}
            </p>
          )}
        </form>

        {/* Quick Helper */}
        {availableReturns.length > 0 && (
          <div className="pt-2 border-t border-border/70 text-[11px] text-slate-500">
            <span>Inbound packages waiting atPeenya hub: </span>
            <strong className="text-slate-800">{availableReturns.length} items</strong>
          </div>
        )}
      </div>
    </Modal>
  );
}
