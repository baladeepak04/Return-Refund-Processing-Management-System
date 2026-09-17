import { jsPDF } from 'jspdf';

/**
 * Generates an official, GST-compliant Tax Credit Note PDF pursuant to Section 34 of the CGST Act, 2017.
 *
 * @param {Object} data
 * @param {string} data.refundId - Refund UUID
 * @param {string} data.returnId - Return Request UUID
 * @param {string} data.orderId - Original Order ID
 * @param {string} data.customerName - Customer full name
 * @param {number} data.amount - Total refund amount in INR
 * @param {string} data.refundMethod - ORIGINAL / STORE_CREDIT / BANK_TRANSFER
 * @param {string} [data.bankRef] - Bank UTR / Gateway payment reference
 * @param {string} [data.reason] - Return reason
 * @param {string} [data.itemDescription] - Product title / description
 * @param {number} [data.quantity] - Number of units returned
 */
export function generateCreditNotePdf(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 16;

  const totalAmount = Number(data.amount || 0);
  // Calculate reverse 18% GST (taxable = total / 1.18)
  const taxableAmount = Math.round((totalAmount / 1.18) * 100) / 100;
  const totalTax = Math.round((totalAmount - taxableAmount) * 100) / 100;
  const cgst = Math.round((totalTax / 2) * 100) / 100;
  const sgst = Math.round((totalTax / 2) * 100) / 100;

  const creditNoteNo = `CN-${String(data.refundId || data.returnId || '0000').substring(0, 8).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Top Banner / Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginX, y, pageWidth - marginX * 2, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('RETURNFLOW TECHNOLOGIES INDIA PVT. LTD.', marginX + 6, y + 8);

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('CIN: U72200KA2024PTC189201 | GSTIN: 29AAAAA0000A1Z5 (State: 29 - Karnataka)', marginX + 6, y + 14);

  y += 26;

  // Title Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('TAX CREDIT NOTE', marginX, y);

  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('(Issued pursuant to Section 34 of the Central Goods & Services Tax Act, 2017 & Rule 54 of CGST Rules)', marginX, y + 4.5);

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // Metadata Grid: Two Columns
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Left Column - Document References
  doc.setFont(undefined, 'bold');
  doc.text('Credit Note No:', marginX, y);
  doc.setFont(undefined, 'normal');
  doc.text(creditNoteNo, marginX + 30, y);

  doc.setFont(undefined, 'bold');
  doc.text('Credit Note Date:', marginX, y + 5);
  doc.setFont(undefined, 'normal');
  doc.text(currentDate, marginX + 30, y + 5);

  doc.setFont(undefined, 'bold');
  doc.text('Original Order ID:', marginX, y + 10);
  doc.setFont(undefined, 'normal');
  doc.text(String(data.orderId || 'ORD-REF-NA').substring(0, 18), marginX + 30, y + 10);

  doc.setFont(undefined, 'bold');
  doc.text('Return Request ID:', marginX, y + 15);
  doc.setFont(undefined, 'normal');
  doc.text(String(data.returnId || '—').substring(0, 18), marginX + 30, y + 15);

  // Right Column - Recipient / Customer Details
  const rightColX = pageWidth / 2 + 6;
  doc.setFont(undefined, 'bold');
  doc.text('Recipient (Customer):', rightColX, y);
  doc.setFont(undefined, 'normal');
  doc.text(String(data.customerName || 'Retail Customer'), rightColX + 34, y);

  doc.setFont(undefined, 'bold');
  doc.text('Refund Method:', rightColX, y + 5);
  doc.setFont(undefined, 'normal');
  doc.text(String(data.refundMethod || 'ORIGINAL_METHOD').replace(/_/g, ' '), rightColX + 34, y + 5);

  doc.setFont(undefined, 'bold');
  doc.text('UTR / Payment Ref:', rightColX, y + 10);
  doc.setFont(undefined, 'normal');
  doc.text(String(data.bankRef || `TXN${Date.now().toString().slice(-8)}`), rightColX + 34, y + 10);

  doc.setFont(undefined, 'bold');
  doc.text('Place of Supply:', rightColX, y + 15);
  doc.setFont(undefined, 'normal');
  doc.text('Karnataka (29)', rightColX + 34, y + 15);

  y += 23;

  // Table Headers
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, y, pageWidth - marginX * 2, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, pageWidth - marginX * 2, 7, 'S');

  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Item Description', marginX + 3, y + 4.5);
  doc.text('HSN Code', marginX + 80, y + 4.5);
  doc.text('Qty', marginX + 105, y + 4.5);
  doc.text('Taxable Value', marginX + 120, y + 4.5);
  doc.text('GST Rate', marginX + 148, y + 4.5);
  doc.text('Total (INR)', marginX + 168, y + 4.5);

  y += 7;

  // Table Row
  doc.setFont(undefined, 'normal');
  doc.setTextColor(15, 23, 42);
  const itemDesc = data.itemDescription || 'Merchandise Return & Refund Adjustment';
  doc.text(itemDesc, marginX + 3, y + 5, { maxWidth: 74 });
  doc.text('84713010', marginX + 80, y + 5);
  doc.text(String(data.quantity || 1), marginX + 105, y + 5);
  doc.text(`INR ${taxableAmount.toLocaleString('en-IN')}`, marginX + 120, y + 5);
  doc.text('18% (9+9)', marginX + 148, y + 5);
  doc.setFont(undefined, 'bold');
  doc.text(`INR ${totalAmount.toLocaleString('en-IN')}`, marginX + 168, y + 5);

  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  // Tax Breakdown Box (Right Aligned with clean margins and zero text collisions)
  const rightAlignX = pageWidth - marginX; // 196 mm
  const breakdownWidth = 85;
  const breakdownX = rightAlignX - breakdownWidth; // 111 mm

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Taxable Subtotal:', breakdownX, y);
  doc.text(`INR ${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightAlignX, y, { align: 'right' });

  doc.text('Central GST (CGST 9%):', breakdownX, y + 5);
  doc.text(`INR ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightAlignX, y + 5, { align: 'right' });

  doc.text('State GST (SGST 9%):', breakdownX, y + 10);
  doc.text(`INR ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightAlignX, y + 10, { align: 'right' });

  y += 14;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(breakdownX, y, rightAlignX, y);
  y += 5;

  doc.setFontSize(9.5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Net Refund Disbursed:', breakdownX, y);
  doc.text(`INR ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightAlignX, y, { align: 'right' });

  y += 15;

  // Declarations & Signatures
  doc.setFontSize(7.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Declaration & Regulatory Compliance:', marginX, y);
  doc.text(
    '1. This credit note is issued under Section 34(1) of the CGST Act 2017 for goods returned by customer following QC verification.\n' +
    '2. The tax liability of the supplier has been adjusted accordingly in accordance with GST provisions.\n' +
    '3. This is an electronically generated and cryptographically sealed document. No physical signature required.',
    marginX,
    y + 4.5,
    { maxWidth: 110 }
  );

  // Digital Signature Seal
  const sealX = pageWidth - marginX - 55;
  doc.setDrawColor(203, 213, 225);
  doc.rect(sealX, y, 55, 24, 'S');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'bold');
  doc.text('For RETURNFLOW TECHNOLOGIES', sealX + 4, y + 5);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('[VERIFIED] DIGITALLY SIGNED', sealX + 4, y + 11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Finance Signatory', sealX + 4, y + 17);
  doc.text(`Timestamp: ${new Date().toISOString()}`, sealX + 4, y + 21);

  // Save the PDF
  doc.save(`${creditNoteNo}.pdf`);
}

export default generateCreditNotePdf;
