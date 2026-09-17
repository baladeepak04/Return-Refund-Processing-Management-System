import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input, Select } from '../../components/ui/Input.jsx';
import { POLICY_ENTITY_TYPE, humanize } from '../../lib/enums.js';
import { listPolicies, createPolicy, updatePolicy, deletePolicy } from '../../lib/api.js';

const emptyForm = {
  name: '',
  entityType: 'CATEGORY',
  entityRef: '',
  returnWindowDays: 7,
  freeReturn: false,
  exchangeEligible: true,
  effectiveFrom: new Date().toISOString().split('T')[0],
  active: true,
};

export default function ReturnPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listPolicies();
      setPolicies(res.data);
    } catch (e) {
      console.error('admin ReturnPolicies error:', e);
      setError(e?.response?.data?.detail || 'Unable to load return policies at this time.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  function openAdd() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setOpen(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      entityType: p.entityType,
      entityRef: p.entityRef || '',
      returnWindowDays: p.returnWindowDays,
      freeReturn: p.freeReturn,
      exchangeEligible: p.exchangeEligible,
      effectiveFrom: p.effectiveFrom || new Date().toISOString().split('T')[0],
      effectiveTo: p.effectiveTo || '',
      active: p.active,
    });
    setOpen(true);
  }

  async function handleSave(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      effectiveFrom: form.effectiveFrom || new Date().toISOString().split('T')[0],
    };
    try {
      if (editingId) {
        await updatePolicy(editingId, payload);
      } else {
        await createPolicy(payload);
      }
      setOpen(false);
      await load();
    } catch (e) {
      console.error('admin ReturnPolicies save error:', e);
      setError(e?.response?.data?.detail || 'Could not save policy.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    setDeletingId(id);
    try {
      await deletePolicy(id);
      await load();
    } catch (e) {
      console.error('admin ReturnPolicies delete error:', e);
      setError(e?.response?.data?.detail || 'Could not delete policy.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="text-sm text-text-secondary">Loading policies…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text">Return Policy Engine</h2>
          <p className="text-sm text-text-secondary">Configure category and SKU-level return windows, eligibility rules, and exchange policies</p>
        </div>
        <Button onClick={openAdd}>+ New Policy</Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      )}

      <div className="space-y-4">
        {policies.length === 0 && <p className="text-sm text-text-muted">No policies yet — create one above.</p>}
        {policies.map((p) => (
          <div key={p.id} className="bg-surface border border-border rounded-lg p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-text">{p.name}</p>
                <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">{p.entityType} {p.entityRef ? `· ${p.entityRef}` : ''}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-success-50 text-success' : 'bg-gray-100 text-text-secondary'}`}>{p.active ? 'active' : 'inactive'}</span>
              </div>
              <div className="grid grid-cols-3 gap-8 text-sm mt-2">
                <div><p className="text-xs text-text-secondary">Return Window</p><p className="font-medium text-text">{p.returnWindowDays > 0 ? `${p.returnWindowDays} days` : 'Not eligible'}</p></div>
                <div><p className="text-xs text-text-secondary">Free Return</p><p className="font-medium text-text">{p.freeReturn ? 'Yes' : 'No'}</p></div>
                <div><p className="text-xs text-text-secondary">Exchange Eligible</p><p className="font-medium text-text">{p.exchangeEligible ? 'Yes' : 'No'}</p></div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
              <Button size="sm" variant="danger" disabled={deletingId === p.id} onClick={() => handleDelete(p.id)}>
                {deletingId === p.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit Return Policy' : 'New Return Policy'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Policy'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Policy name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Electronics Standard" />
          <Select label="Entity type" value={form.entityType} onChange={(e) => update('entityType', e.target.value)} options={POLICY_ENTITY_TYPE.map((v) => ({ value: v, label: humanize(v) }))} />
          <Input label="Category / seller reference" value={form.entityRef} onChange={(e) => update('entityRef', e.target.value)} placeholder="e.g. Electronics" />
          <Input label="Return window (days)" type="number" value={form.returnWindowDays} onChange={(e) => update('returnWindowDays', e.target.value)} />
          <Input label="Effective from date" type="date" value={form.effectiveFrom || ''} onChange={(e) => update('effectiveFrom', e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={form.freeReturn} onChange={(e) => update('freeReturn', e.target.checked)} /> Free return
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={form.exchangeEligible} onChange={(e) => update('exchangeEligible', e.target.checked)} /> Exchange eligible
          </label>
          {editingId && (
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} /> Active
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
