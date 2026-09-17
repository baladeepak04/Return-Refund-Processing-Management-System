import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { Textarea } from '../../components/ui/Input.jsx';
import { CONDITION_GRADE, CONDITION_GRADE_LABEL, DISPOSITION, DISPOSITION_LABEL } from '../../lib/enums.js';
import api, { submitQcInspection } from '../../lib/api.js';

const CHECKLIST = [
  'Original packaging present', 'All accessories included', 'No physical damage',
  'Device powers on', 'All functions working', 'Customer complaint matches condition',
];

// Condition grade proposes default disposition; QC staff can confirm or override.
const SUGGESTED_DISPOSITION = {
  MINT: 'RESTOCK_NEW', GOOD: 'RESTOCK_REFURB', FAIR: 'LIQUIDATE', DAMAGED: 'DISPOSE', UNUSABLE: 'DISPOSE',
};

export default function InspectionWorkspace() {
  const params = useParams();
  const returnId = params.returnId || params.qcId;
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [checked, setChecked] = useState({});
  const [grade, setGrade] = useState(null);
  const [functionalTest, setFunctionalTest] = useState('NA');
  const [disposition, setDisposition] = useState(null);
  const [notes, setNotes] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await api.get(`/returns/${returnId}`);
        setItem(res.data);
      } catch (e) {
        console.error('qc InspectionWorkspace error:', e);
        setLoadError(e?.response?.data?.detail || 'Could not load this return.');
      } finally {
        setLoading(false);
      }
    })();
  }, [returnId]);

  function toggleCheck(label) { setChecked((c) => ({ ...c, [label]: !c[label] })); }
  function selectGrade(g) { setGrade(g); setDisposition(SUGGESTED_DISPOSITION[g]); }

  const REQUIRES_EVIDENCE = ['DEFECTIVE', 'DAMAGED_IN_TRANSIT'];

  async function submit(isDraft) {
    setSubmitting(true);
    setSubmitError('');
    // Photo evidence mandatory for defective or damaged items
    // reasons — same rule the backend now enforces; checked here too so the
    // person gets an immediate, specific message instead of a generic 400.
    if (REQUIRES_EVIDENCE.includes(item?.reasonCode) && imageUrls.length === 0) {
      setSubmitError(`At least one QC image is required for a '${item.reasonCode}' return.`);
      setSubmitting(false);
      return;
    }
    try {
      await submitQcInspection({
        returnId,
        conditionGrade: grade,
        functionalTest,
        disposition,
        notes,
        images: imageUrls,
        complaintValidated: !!checked['Customer complaint matches condition'],
      });
      navigate('/qc/inspection-queue');
    } catch (e) {
      console.error('qc InspectionWorkspace error:', e);
      setSubmitError(e?.response?.data?.detail || 'Could not submit the inspection.');
    } finally {
      setSubmitting(false);
      if (isDraft) { /* draft: stay on page, no navigation */ }
    }
  }

  if (loading) return <p className="text-sm text-text-secondary">Loading return…</p>;
  if (loadError) return <p className="text-sm text-danger bg-danger-50 rounded-md px-3 py-2">{loadError}</p>;

  function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawData = event.target?.result;
        if (!rawData) return;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setImageUrls((prev) => [...prev, compressed]);
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="space-y-6">
      {/* Warehouse Barcode Scan Simulation Header */}
      <div className="bg-white border border-border rounded-lg p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-lg font-mono">
            📷
          </div>
          <div>
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">Warehouse Inward Barcode Scanner</h2>
            <p className="text-[11px] text-text-muted">Return Barcode / AWB: <strong className="font-mono text-primary">{returnId}</strong></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Scan return barcode / AWB..."
            defaultValue={returnId}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/qc/workspace/${e.target.value.trim()}`);
              }
            }}
            className="text-xs border border-border rounded px-2.5 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" variant="outline" onClick={() => navigate('/qc/inspection-queue')}>
            Queue List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text">QC Inspection Photos & Defect Evidence</h2>
              <span className="text-xs text-text-muted">{imageUrls.length} attached</span>
            </div>

            {/* Photo Previews */}
            {imageUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group border border-border rounded-lg overflow-hidden h-28 bg-gray-100">
                    <img src={url} alt={`Defect evidence ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrls((u) => u.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg h-48 flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-border mb-3">
                <span className="text-3xl mb-1">📸</span>
                <p className="text-xs font-medium">No defect photos attached yet</p>
                <p className="text-[11px]">Required for Defective and Damaged returns</p>
              </div>
            )}

            {/* Upload Buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <span className="w-full inline-flex items-center justify-center px-3 py-2 border border-border rounded-md text-xs font-medium bg-white hover:bg-gray-50 text-text transition-colors">
                    📁 Upload Local Defect Photos
                  </span>
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Or paste an image URL..."
                  className="flex-1 border border-border rounded-md px-3 py-1.5 text-xs"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (imageUrlInput.trim()) {
                      setImageUrls((u) => [...u, imageUrlInput.trim()]);
                      setImageUrlInput('');
                    }
                  }}
                >
                  Add URL
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Return & Product Details</p>
              {item.refundAmount && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Valuation: ₹{Number(item.refundAmount).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50/80 rounded-lg border border-border/60">
              <p className="text-[11px] text-text-muted font-medium">Product to Inspect</p>
              <p className="font-semibold text-sm text-slate-900 mt-0.5">
                {item.items?.[0]?.productName || 'General Return Item'}
              </p>
              {item.items?.[0]?.quantity && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Quantity: {item.items[0].quantity} {item.items[0].returnReason ? `· Note: ${item.items[0].returnReason}` : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-secondary">Return ID</p>
                <p className="font-mono font-semibold text-primary text-xs mt-0.5">#{String(item.id).slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Customer</p>
                <p className="font-semibold text-text text-xs mt-0.5">
                  {item.customerName || `Customer ${String(item.customerId).slice(0, 8)}`}
                </p>
                {item.customerEmail && (
                  <p className="text-[10px] text-text-muted">{item.customerEmail}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-text-secondary">Return Type</p>
                <p className="font-medium text-text text-xs mt-0.5">{item.returnType}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Customer Reason</p>
                <p className="font-medium text-text text-xs mt-0.5">{item.reasonCode}</p>
              </div>
            </div>
          </div>
      </div>

      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold text-text mb-3">Inspection Checklist</h2>
          <div className="space-y-2">
            {CHECKLIST.map((label) => (
              <label key={label} className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={!!checked[label]} onChange={() => toggleCheck(label)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold text-text mb-3">Condition Grade</h2>
          <div className="grid grid-cols-2 gap-3">
            {CONDITION_GRADE.map((g) => (
              <button
                key={g}
                onClick={() => selectGrade(g)}
                className={`text-left border rounded-lg p-3 ${grade === g ? 'border-primary bg-primary-50' : 'border-border'}`}
              >
                <p className="font-semibold text-sm text-text">{g}</p>
                <p className="text-xs text-text-secondary">{CONDITION_GRADE_LABEL[g].split('—')[1]}</p>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-text mb-1">Functional test</label>
            <div className="flex gap-2">
              {['PASS', 'FAIL', 'NA'].map((v) => (
                <button key={v} onClick={() => setFunctionalTest(v)} className={`px-3 py-1.5 rounded-md text-sm border ${functionalTest === v ? 'border-primary bg-primary-50 text-primary' : 'border-border text-text-secondary'}`}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-semibold text-text mb-3">Disposition Decision</h2>
          <div className="space-y-2">
            {DISPOSITION.map((d) => (
              <button
                key={d}
                onClick={() => setDisposition(d)}
                className={`w-full text-left border rounded-lg p-3 flex items-center justify-between ${disposition === d ? 'border-primary bg-primary-50' : 'border-border'}`}
              >
                <span className="text-sm font-medium text-text">{DISPOSITION_LABEL[d]}</span>
                {SUGGESTED_DISPOSITION[grade] === d && <span className="text-xs text-primary">Suggested</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <Textarea label="Inspector Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add detailed observations..." />
        </div>

        {submitError && <p className="text-sm text-danger bg-danger-50 rounded-md px-3 py-2">{submitError}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => submit(true)} disabled={submitting}>Save Draft</Button>
          <Button onClick={() => submit(false)} disabled={submitting || !grade || !disposition}>Submit Report</Button>
        </div>
      </div>
    </div>
  </div>
  );
}
