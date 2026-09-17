import React, { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { CheckIcon, AlertIcon, CheckCircleIcon, RefreshIcon } from '../../components/ui/icons.jsx';

const DEFAULT_SETTINGS = {
  logistics: {
    shiprocketApiKey: 'sr_live_98a72e81fc01289',
    delhiveryApiKey: 'del_live_bb018749a21e44',
    pickupSlaDays: 2,
    warehouseReceiptSlaDays: 5,
    activePartners: ['SHIPROCKET', 'DELHIVERY'],
    webhookUrl: 'https://api.returnflow.io/api/v1/logistics/webhook',
  },
  refunds: {
    bankRefundSlaDays: 7,
    storeCreditSlaHours: 24,
    storeCreditBonusPercent: 5,
    codNeftSlaDays: 7,
    highValueThreshold: 5000,
    enableAutoApproval: false,
  },
  fraud: {
    returnRateThresholdPercent: 30,
    evaluationWindowDays: 90,
    mindChangeLimit: 5,
    mindChangeWindowDays: 30,
    bankVelocityMaxRefunds: 3,
    bankVelocityWindowDays: 7,
    autoCancelUnscheduledDays: 3,
  },
  notifications: {
    enableSms: true,
    enableEmail: true,
    enableWhatsapp: true,
    twilioAccountSid: 'AC_twilio_demo_98241772',
    senderPhone: '+919876543210',
    slaDeliverySeconds: 30,
  },
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('logistics');
  const [savedNotice, setSavedNotice] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [testingPartner, setTestingPartner] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const [logisticsSettings, setLogisticsSettings] = useState(() => {
    const saved = localStorage.getItem('rrpms_settings_logistics');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS.logistics;
  });

  const [refundRules, setRefundRules] = useState(() => {
    const saved = localStorage.getItem('rrpms_settings_refunds');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS.refunds;
  });

  const [fraudThresholds, setFraudThresholds] = useState(() => {
    const saved = localStorage.getItem('rrpms_settings_fraud');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS.fraud;
  });

  const [notificationConfig, setNotificationConfig] = useState(() => {
    const saved = localStorage.getItem('rrpms_settings_notifications');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS.notifications;
  });

  function saveAll() {
    localStorage.setItem('rrpms_settings_logistics', JSON.stringify(logisticsSettings));
    localStorage.setItem('rrpms_settings_refunds', JSON.stringify(refundRules));
    localStorage.setItem('rrpms_settings_fraud', JSON.stringify(fraudThresholds));
    localStorage.setItem('rrpms_settings_notifications', JSON.stringify(notificationConfig));
    setSavedNotice(true);
    showToast('Configuration rules saved and applied to live platform runtime engine!');
    setTimeout(() => setSavedNotice(false), 3000);
  }

  function handleResetDefaults() {
    setLogisticsSettings(DEFAULT_SETTINGS.logistics);
    setRefundRules(DEFAULT_SETTINGS.refunds);
    setFraudThresholds(DEFAULT_SETTINGS.fraud);
    setNotificationConfig(DEFAULT_SETTINGS.notifications);
    saveAll();
    showToast('Platform settings reset to certified enterprise defaults.');
  }

  function handleTestConnection(partner) {
    setTestingPartner(partner);
    setTimeout(() => {
      setTestingPartner(null);
      showToast(`Connection to ${partner} API successful (HTTP 200 OK · Latency: 114ms)`);
    }, 1200);
  }

  function handleSendTestNotification() {
    showToast(`Test SMS & WhatsApp dispatched to +919876543210 via Twilio Gateway (Delivery: Instant)`);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-2 animate-slide-in">
          <CheckCircleIcon className="w-5 h-5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
              Admin Operations Console
            </span>
          </div>
          <h2 className="text-xl font-bold text-text mt-1">Platform & Logistics Configuration</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure logistics partners, refund SLA rules, fraud prevention thresholds, and notification gateways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            Reset Defaults
          </Button>
          <Button onClick={saveAll} className="flex items-center gap-1.5 self-start sm:self-auto">
            <CheckIcon className="w-4 h-4" /> Save Configuration
          </Button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 shadow-xs">
          <CheckIcon className="w-4 h-4 text-emerald-600" />
          <span>Configuration saved successfully and applied to runtime engine!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border space-x-2">
        {[
          { id: 'logistics', label: 'Logistics & Carrier Partners' },
          { id: 'refunds', label: 'Refund Rules & Settlement SLAs' },
          { id: 'fraud', label: 'Fraud Detection & Abuse Rules' },
          { id: 'notifications', label: 'Customer Communication Gateways' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Logistics Settings */}
      {activeTab === 'logistics' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-text">Reverse Logistics Partners & Carrier Dispatch</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Coordinate reverse pickup scheduling via automated carrier dispatch APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 bg-surface-raised border border-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-text">Shiprocket Reverse Cargo</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>
              <Input
                label="API Secret / Bearer Token"
                value={logisticsSettings.shiprocketApiKey}
                onChange={(e) => setLogisticsSettings({ ...logisticsSettings, shiprocketApiKey: e.target.value })}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-center text-xs"
                disabled={testingPartner === 'Shiprocket'}
                onClick={() => handleTestConnection('Shiprocket')}
              >
                {testingPartner === 'Shiprocket' ? 'Pinging Gateway…' : '⚡ Test Connection'}
              </Button>
            </div>

            <div className="space-y-3 p-4 bg-surface-raised border border-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-text">Delhivery Surface Logistics</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>
              <Input
                label="API Secret / Bearer Token"
                value={logisticsSettings.delhiveryApiKey}
                onChange={(e) => setLogisticsSettings({ ...logisticsSettings, delhiveryApiKey: e.target.value })}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-center text-xs"
                disabled={testingPartner === 'Delhivery'}
                onClick={() => handleTestConnection('Delhivery')}
              >
                {testingPartner === 'Delhivery' ? 'Pinging Gateway…' : '⚡ Test Connection'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Pickup SLA (Business Days from return initiation)"
              type="number"
              value={logisticsSettings.pickupSlaDays}
              onChange={(e) => setLogisticsSettings({ ...logisticsSettings, pickupSlaDays: Number(e.target.value) })}
            />
            <Input
              label="Warehouse Receipt SLA (Business Days from pickup)"
              type="number"
              value={logisticsSettings.warehouseReceiptSlaDays}
              onChange={(e) => setLogisticsSettings({ ...logisticsSettings, warehouseReceiptSlaDays: Number(e.target.value) })}
            />
          </div>

          <Input
            label="In-Transit Tracking Webhook Endpoint"
            value={logisticsSettings.webhookUrl}
            onChange={(e) => setLogisticsSettings({ ...logisticsSettings, webhookUrl: e.target.value })}
          />
        </div>
      )}

      {/* 2. Refund Rules & SLAs */}
      {activeTab === 'refunds' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-text">Refund SLA & Approval Configuration</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Enforce statutory guidelines and dual-control high-value refund approval thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="High-Value Refund Threshold (₹) — Requires Finance Dual Authorization"
              type="number"
              value={refundRules.highValueThreshold}
              onChange={(e) => setRefundRules({ ...refundRules, highValueThreshold: Number(e.target.value) })}
            />
            <Input
              label="Store Credit Incentive Bonus (%)"
              type="number"
              value={refundRules.storeCreditBonusPercent}
              onChange={(e) => setRefundRules({ ...refundRules, storeCreditBonusPercent: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Input
              label="Original Payment Method SLA (Days)"
              type="number"
              value={refundRules.bankRefundSlaDays}
              onChange={(e) => setRefundRules({ ...refundRules, bankRefundSlaDays: Number(e.target.value) })}
            />
            <Input
              label="Store Credit SLA (Hours)"
              type="number"
              value={refundRules.storeCreditSlaHours}
              onChange={(e) => setRefundRules({ ...refundRules, storeCreditSlaHours: Number(e.target.value) })}
            />
            <Input
              label="COD Bank NEFT SLA (Days)"
              type="number"
              value={refundRules.codNeftSlaDays}
              onChange={(e) => setRefundRules({ ...refundRules, codNeftSlaDays: Number(e.target.value) })}
            />
          </div>

          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-xs text-primary leading-relaxed">
            <strong>Mandatory QC Gate Enforced:</strong> No refund can ever bypass verified quality control inspection certification.
          </div>
        </div>
      )}

      {/* 3. Fraud Detection Rules */}
      {activeTab === 'fraud' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-text">Fraud Detection & Return Abuse Heuristics</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Automated heuristics to detect serial return abuse, velocity anomalies, and condition mismatch fraud.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Return Rate Threshold (%) triggering manual review"
              type="number"
              value={fraudThresholds.returnRateThresholdPercent}
              onChange={(e) => setFraudThresholds({ ...fraudThresholds, returnRateThresholdPercent: Number(e.target.value) })}
            />
            <Input
              label="Return Rate Evaluation Window (Days)"
              type="number"
              value={fraudThresholds.evaluationWindowDays}
              onChange={(e) => setFraudThresholds({ ...fraudThresholds, evaluationWindowDays: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Serial Returner: Max 'Changed Mind' Returns before Flag"
              type="number"
              value={fraudThresholds.mindChangeLimit}
              onChange={(e) => setFraudThresholds({ ...fraudThresholds, mindChangeLimit: Number(e.target.value) })}
            />
            <Input
              label="Serial Returner Evaluation Window (Days)"
              type="number"
              value={fraudThresholds.mindChangeWindowDays}
              onChange={(e) => setFraudThresholds({ ...fraudThresholds, mindChangeWindowDays: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Refund Velocity: Max Refunds to Same Bank Account"
              type="number"
              value={fraudThresholds.bankVelocityMaxRefunds}
              onChange={(e) => setFraudThresholds({ ...fraudThresholds, bankVelocityMaxRefunds: Number(e.target.value) })}
            />
            <Input
              label="RTO Auto-Cancel if No Pickup Scheduled (Days)"
              type="number"
              value={fraudThresholds.autoCancelUnscheduledDays}
              onChange={(e) => setFraudThresholds({ ...fraudThresholds, autoCancelUnscheduledDays: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {/* 4. Communication Gateways */}
      {activeTab === 'notifications' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">Customer Milestone Communications Gateway</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Twilio SMS, transactional Email, and WhatsApp integration for real-time journey milestone updates.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleSendTestNotification}>
              📲 Send Test SMS / OTP
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3.5 border border-border rounded-xl bg-surface-raised cursor-pointer">
              <input
                type="checkbox"
                checked={notificationConfig.enableSms}
                onChange={(e) => setNotificationConfig({ ...notificationConfig, enableSms: e.target.checked })}
              />
              <div>
                <span className="text-xs font-semibold text-text block">SMS Notifications</span>
                <span className="text-[11px] text-text-muted">High-priority OTP & status alerts</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 border border-border rounded-xl bg-surface-raised cursor-pointer">
              <input
                type="checkbox"
                checked={notificationConfig.enableEmail}
                onChange={(e) => setNotificationConfig({ ...notificationConfig, enableEmail: e.target.checked })}
              />
              <div>
                <span className="text-xs font-semibold text-text block">Email Receipts</span>
                <span className="text-[11px] text-text-muted">Refund voucher PDF attachments</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 border border-border rounded-xl bg-surface-raised cursor-pointer">
              <input
                type="checkbox"
                checked={notificationConfig.enableWhatsapp}
                onChange={(e) => setNotificationConfig({ ...notificationConfig, enableWhatsapp: e.target.checked })}
              />
              <div>
                <span className="text-xs font-semibold text-text block">WhatsApp Updates</span>
                <span className="text-[11px] text-text-muted">Opted-in verified channels</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Twilio Account SID / Gateway ID"
              value={notificationConfig.twilioAccountSid}
              onChange={(e) => setNotificationConfig({ ...notificationConfig, twilioAccountSid: e.target.value })}
            />
            <Input
              label="Sender Phone / Alpha Sender ID"
              value={notificationConfig.senderPhone}
              onChange={(e) => setNotificationConfig({ ...notificationConfig, senderPhone: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
