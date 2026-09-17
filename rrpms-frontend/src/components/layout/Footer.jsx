import React from 'react';

/**
 * Footer conforming to Appendix I.5 of the Return & Refund Processing Management System (SRS-29):
 * - Return policy summary
 * - Refund SLA commitment
 * - Consumer rights under Consumer Protection (E-Commerce) Rules 2020
 * - Support contact & privacy policy
 */
export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-white/70 backdrop-blur-xs mt-auto py-6 px-6 text-xs text-text-muted">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 font-semibold text-text">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>ReturnFlow Enterprise (SRS-29)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              v1.0 Production
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Compliant with Consumer Protection (E-Commerce) Rules 2020 &amp; RBI Merchant Refund Guidelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px]">
          <span className="text-slate-600 font-medium">
            ⚡ <strong>Refund SLA:</strong> Store Credit 24h (+5% Bonus) · Original Mode 5–7 Days · COD NEFT 7 Days
          </span>
          <span className="hidden lg:inline text-slate-300">|</span>
          <a
            href="mailto:support@returnflow.io"
            className="text-primary hover:underline font-medium"
          >
            support@returnflow.io
          </a>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Data Retention: 7 Years (AES-256)</span>
        </div>
      </div>
    </footer>
  );
}
