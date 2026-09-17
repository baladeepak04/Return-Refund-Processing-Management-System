import { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { PrinterIcon, CheckCircleIcon, ShieldIcon, DownloadIcon } from '../ui/icons';
import { jsPDF } from 'jspdf';

export default function ShippingLabelModal({ isOpen, onClose, returnRequest, pickup }) {
  const labelRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !returnRequest) return null;

  const handlePrint = () => {
    window.print();
  };

  const awb = pickup?.awbNumber || `AWB${returnRequest.id.substring(0, 8).toUpperCase()}`;
  const partner = pickup?.logisticsPartner || 'SHIPROCKET';
  const otp = pickup?.pickupOtp || returnRequest.id.substring(0, 4).toUpperCase();
  const address = pickup?.pickupAddress || 'Flat 402, Prestige Palms, 12th Main Road, Indiranagar, Bengaluru - 560038';

  const handleDownloadPdf = () => {
    setDownloading(true);
    try {
      // Standard 4x6 inch (102mm x 152mm) thermal shipping label dimensions
      const doc = new jsPDF({ unit: 'mm', format: [102, 152] });
      const pw = 102;
      const ph = 152;
      const m = 6;

      // Outer border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.rect(m, m, pw - m * 2, ph - m * 2);

      // Header: Left Title and Right Partner Badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RETURNFLOW EXPRESS', m + 3, m + 7);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('PRIORITY REVERSE LOGISTICS', m + 3, m + 11);

      // Partner badge box (right-aligned, no overlap with title)
      const badgeW = 32;
      const badgeH = 7.5;
      const badgeX = pw - m - badgeW - 2;
      const badgeY = m + 2.5;
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(badgeX, badgeY, badgeW, badgeH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`${partner} REVERSE`, badgeX + badgeW / 2, badgeY + 5, { align: 'center' });

      // Horizontal Divider 1
      doc.setLineWidth(0.5);
      doc.line(m, 18, pw - m, 18);

      // Barcode Section
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text('AIR WAYBILL (AWB) TRACKING BARCODE', pw / 2, 23, { align: 'center' });

      // Scaled Barcode bars (exactly 64mm width, centered on 102mm label)
      const barY = 25.5;
      const barH = 13;
      const pattern = [2, 1, 1, 3, 1, 2, 1, 1, 3, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 1, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2, 1, 3, 1];
      const targetWidth = 64;
      const totalUnits = pattern.reduce((s, u) => s + u, 0) + (pattern.length - 1) * 0.5;
      const scale = targetWidth / totalUnits;
      let curX = (pw - targetWidth) / 2;

      pattern.forEach((u) => {
        const barW = u * scale;
        doc.setFillColor(0, 0, 0);
        doc.rect(curX, barY, barW, barH, 'F');
        curX += barW + (0.5 * scale);
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`* ${awb} *`, pw / 2, 43.5, { align: 'center' });

      // Horizontal Divider 2
      doc.line(m, 46.5, pw - m, 46.5);

      // Routing Grid: Sender (Left) & Destination (Right)
      const midX = pw / 2;
      doc.line(midX, 46.5, midX, 85);

      // Shipper / Sender (Left)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('SHIPPER / RETURN FROM:', m + 3, 51);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Verified Customer', m + 3, 55.5);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const splitSenderAddr = doc.splitTextToSize(address, 38);
      doc.text(splitSenderAddr, m + 3, 60);

      // Destination Hub (Right)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('DESTINATION HUB:', midX + 3, 51);
      doc.setFontSize(8);
      doc.text('ReturnFlow Central QC Hub', midX + 3, 55.5);
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const hubAddr = 'Inward Dock 4, Peenya Industrial Area, Phase II, Bengaluru - 560058';
      doc.text(doc.splitTextToSize(hubAddr, 38), midX + 3, 60);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Hub Code: BLR-PEENYA-QC01', midX + 3, 79);

      // Horizontal Divider 3
      doc.line(m, 85, pw - m, 85);

      // Metadata & OTP Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('RETURN ID:', m + 3, 91);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(returnRequest.id.substring(0, 18).toUpperCase(), m + 3, 95.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('REASON:', m + 3, 102);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(returnRequest.reasonCode || 'RETURN', m + 3, 106.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('ESTIMATED REFUND:', m + 3, 113);
      doc.setFontSize(7.5);
      doc.text('INR 1,499.00', m + 33, 113);

      // OTP Verification Box
      const otpBoxW = 32;
      const otpBoxH = 24;
      const otpBoxX = pw - m - otpBoxW - 2;
      const otpBoxY = 88;
      doc.setLineWidth(0.6);
      doc.rect(otpBoxX, otpBoxY, otpBoxW, otpBoxH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('PICKUP OTP', otpBoxX + otpBoxW / 2, otpBoxY + 6, { align: 'center' });
      doc.setFontSize(14);
      doc.text(otp, otpBoxX + otpBoxW / 2, otpBoxY + 15.5, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('DOORSTEP VERIFY', otpBoxX + otpBoxW / 2, otpBoxY + 20.5, { align: 'center' });

      // Horizontal Divider 4
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(m, 117, pw - m, 117);

      // Carrier Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('CARRIER PICKUP INSTRUCTIONS:', m + 3, 122.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(40, 40, 40);
      doc.text('1. Verify OTP with customer before taking possession of the parcel.', m + 3, 127);
      doc.text('2. Ensure parcel is completely sealed and tamper-evident.', m + 3, 131);
      doc.text('3. Scan AWB barcode upon loading onto pickup dispatch van.', m + 3, 135);

      // Footer
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text('ORIGINAL SHIPPING DOCUMENT — DO NOT BEND', pw / 2, ph - m - 3.5, { align: 'center' });

      doc.save(`Shipping-Label-${awb}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reverse Logistics Shipping Label" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-primary-50 p-3 rounded-lg border border-primary-100 text-xs text-primary-800 flex-wrap gap-2 no-print">
          <span>Attach this label securely to the outer return parcel before courier pickup.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary-300 text-primary rounded-md hover:bg-primary-50 font-semibold shadow-xs"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              {downloading ? 'Downloading…' : 'Download PDF Label'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary-dark font-medium shadow-xs"
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              Print Label
            </button>
          </div>
        </div>

        {/* Printable Label Box */}
        <div
          id="shipping-label-printable"
          ref={labelRef}
          className="printable-document border-2 border-dashed border-gray-400 p-6 rounded-lg bg-white text-text font-sans max-w-xl mx-auto shadow-sm"
        >
          {/* Header Row */}
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-3">
            <div>
              <div className="font-extrabold text-xl tracking-tight text-gray-950">RETURNFLOW EXPRESS</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold">Priority Reverse Logistics</div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 border border-gray-900 font-black text-xs uppercase tracking-wider bg-gray-100">
                {partner} REVERSE
              </span>
              <div className="text-[11px] font-mono font-bold mt-1">STANDARD AIR CARGO</div>
            </div>
          </div>

          {/* Barcode Simulation */}
          <div className="py-4 text-center border-b-2 border-gray-900">
            <div className="inline-block tracking-widest font-mono text-[10px] text-gray-600 mb-1">
              AIR WAYBILL (AWB) TRACKING BARCODE
            </div>
            {/* SVG Code 128 barcode simulation */}
            <div className="flex justify-center items-center gap-1 h-14 bg-gray-50 p-2 rounded">
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 4, 2].map((w, i) => (
                <div key={i} className="bg-black h-full" style={{ width: `${w * 2}px` }} />
              ))}
            </div>
            <div className="font-mono text-sm font-black tracking-widest mt-1 text-gray-950">
              *{awb}*
            </div>
          </div>

          {/* Grid: Routing & Addresses */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b-2 border-gray-900 text-xs">
            {/* Sender */}
            <div className="border-r border-gray-200 pr-3">
              <div className="font-bold text-[10px] text-gray-700 uppercase tracking-wide mb-1">
                SHIPPER / RETURN FROM:
              </div>
              <div className="font-bold text-gray-950">Verified Retail Customer</div>
              <div className="text-gray-700 text-[11px] mt-0.5 leading-relaxed">{address}</div>
              <div className="text-[10px] text-gray-700 mt-1">Tel: +91 98765 43210</div>
            </div>

            {/* Consignee */}
            <div className="pl-1">
              <div className="font-bold text-[10px] text-gray-700 uppercase tracking-wide mb-1">
                RETURN TO DESTINATION:
              </div>
              <div className="font-bold text-gray-950">ReturnFlow Central QC Hub</div>
              <div className="text-gray-700 text-[11px] mt-0.5 leading-relaxed">
                Inward Logistics Dock 4, Plot 18-B, Peenya Industrial Area, Phase II, Bengaluru - 560058
              </div>
              <div className="text-[10px] text-gray-700 mt-1">Hub Code: BLR-PEENYA-QC01</div>
            </div>
          </div>

          {/* Return & Verification Details */}
          <div className="grid grid-cols-3 gap-2 py-3 border-b-2 border-gray-900 text-xs">
            <div className="p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-[10px] text-gray-700 block font-semibold">RETURN ID:</span>
              <span className="font-mono font-bold text-xs truncate block">{returnRequest.id.substring(0, 13)}…</span>
            </div>
            <div className="p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-[10px] text-gray-700 block font-semibold">REASON CODE:</span>
              <span className="font-bold text-xs block text-gray-900">{returnRequest.reasonCode || 'RETURN'}</span>
            </div>
            <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-700 block font-bold">PICKUP OTP:</span>
              <span className="font-mono font-black text-sm tracking-widest text-emerald-800">{otp}</span>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="pt-3 flex items-center justify-between text-[10px] text-gray-700">
            <div className="flex items-center gap-1.5">
              <ShieldIcon className="w-3.5 h-3.5 text-gray-900" />
              <span>Tamper-evident barcode verified. Driver must verify OTP at doorstep.</span>
            </div>
            <div className="font-mono">Page 1 of 1</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-gray-50 font-medium"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2 border border-primary-300 bg-white text-primary rounded-lg text-sm hover:bg-primary-50 font-semibold inline-flex items-center gap-1.5 shadow-xs"
          >
            <DownloadIcon className="w-4 h-4" />
            {downloading ? 'Generating PDF…' : 'Download Label (PDF)'}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark font-medium inline-flex items-center gap-1.5 shadow-xs"
          >
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>
    </Modal>
  );
}
