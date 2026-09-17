import React, { useEffect, useState } from 'react';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Input, Select } from '../../components/ui/Input.jsx';
import { ROLES, ROLE_LABEL } from '../../lib/enums.js';
import { listUsers, createUser, updateUser, disableUser, enableUser } from '../../lib/api.js';

const emptyForm = { name: '', email: '', role: ROLES.CUSTOMER_SUPPORT, department: '', password: 'Password123!' };

export default function UserManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await listUsers();
      setRows(res.data);
    } catch (e) {
      console.error('admin UserManagement error:', e);
      setError(e?.response?.data?.detail || 'Unable to retrieve system users at this time.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(u) {
    try {
      if (u.enabled) await disableUser(u.id);
      else await enableUser(u.id);
      await load();
    } catch (e) {
      console.error('admin UserManagement error:', e);
      setError(e?.response?.data?.detail || 'Could not update user status.');
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(u) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, role: u.role.toLowerCase(), department: u.department || '', password: '' });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        // Real PUT /api/v1/admin/users/{id} — email/password intentionally
        // not editable here (identity + reset are separate concerns).
        await updateUser(editingId, { name: form.name, role: form.role.toUpperCase(), department: form.department });
      } else {
        await createUser({ name: form.name, email: form.email, role: form.role.toUpperCase(), department: form.department, password: form.password });
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      console.error('admin UserManagement error:', e);
      setError(e?.response?.data?.detail || `Could not ${editingId ? 'update' : 'create'} user.`);
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'name', header: 'Name', render: (u) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-semibold">{u.name?.charAt(0)}</div>
          <div><p className="font-medium text-text">{u.name}</p><p className="text-xs text-text-secondary">{u.email}</p></div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <span className="text-xs bg-primary-50 text-primary px-2 py-1 rounded-full">{ROLE_LABEL[u.role?.toLowerCase()] || u.role}</span> },
    { key: 'department', header: 'Department' },
    {
      key: 'enabled', header: 'Status', render: (u) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.enabled ? 'bg-success-50 text-success' : 'bg-gray-100 text-text-secondary'}`}>{u.enabled ? 'active' : 'inactive'}</span>
      ),
    },
    { key: 'lastLogin', header: 'Last Login', render: (u) => u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN') : '—' },
    {
      key: 'actions', header: 'Actions', render: (u) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
          <Button size="sm" variant={u.enabled ? 'danger' : 'success'} onClick={() => toggleStatus(u)}>
            {u.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <p className="text-sm text-text-secondary">Loading users…</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>Retry</Button>
        </div>
      )}
      <DataTable
        title="Enterprise User Directory"
        columns={columns}
        rows={rows}
        searchKeys={['name', 'email', 'department']}
        exportFilename="users"
        actions={<Button size="sm" onClick={openAdd}>+ Add User</Button>}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit User' : 'Add User'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name || (!editingId && !form.email)}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add User'}</Button></>}
      >
        <div className="space-y-4">
          <Input label="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={!!editingId} />
          {editingId && <p className="text-xs text-text-muted -mt-3">Email can't be changed here — it's the login identity.</p>}
          <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            options={Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          <Input label="Department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
          {!editingId && <Input label="Temporary password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />}
        </div>
      </Modal>
    </div>
  );
}
