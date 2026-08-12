import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_PERMISSIONS = [
  'catalog:read',
  'catalog:write',
  'catalog:delete',
  'orders:read',
  'orders:write',
  'commerce:manage',
  'vendors:manage',
  'reports:read',
  'cms:manage',
  'media:manage',
  'staff:manage',
  'audit:read',
  'bulk:manage',
  'webhooks:manage',
  'users:read',
  'users:manage',
];

const STAFF_ROLES = [
  'custom',
  'catalog_manager',
  'order_manager',
  'commerce_manager',
  'content_manager',
  'analyst',
  'vendor_manager',
  'user_manager',
];

const SECTIONS = {
  customers: {
    label: 'Customer Users',
    singular: 'customer',
    icon: UserRound,
    description: 'Customer profiles, delivery details, preferences, and account access.',
  },
  staff: {
    label: 'Staff Users',
    singular: 'staff member',
    icon: Users,
    description: 'Staff accounts, operational roles, and assigned permissions.',
  },
  admins: {
    label: 'Admin Users',
    singular: 'administrator',
    icon: ShieldCheck,
    description: 'Administrator accounts with full system access and two-factor protection.',
  },
};

const createInitialForm = (type) => ({
  name: '',
  email: '',
  phone: '',
  countryCode: 'LK',
  countryName: 'Sri Lanka',
  preferredCurrency: 'LKR',
  password: '',
  accountStatus: 'Active',
  staffStatus: 'Active',
  role: type === 'staff' ? 'custom' : type === 'admins' ? 'admin' : 'customer',
  staffPermissions: [],
});

const getPermission = (userInfo, permission) =>
  Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes(permission) ||
      userInfo?.permissions?.includes('*')
  );

const getSectionAccess = (userInfo, type) => {
  if (type === 'admins') {
    return { read: Boolean(userInfo?.isAdmin), manage: Boolean(userInfo?.isAdmin) };
  }

  if (type === 'staff') {
    const allowed = getPermission(userInfo, 'staff:manage');
    return { read: allowed, manage: allowed };
  }

  return {
    read: getPermission(userInfo, 'users:read') || getPermission(userInfo, 'users:manage'),
    manage: getPermission(userInfo, 'users:manage'),
  };
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const StatusBadge = ({ status = 'Active' }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
      status === 'Suspended' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
    }`}
  >
    {status}
  </span>
);

const SectionNav = ({ activeType, access }) => (
  <nav className="flex flex-wrap gap-2" aria-label="User-management sections">
    {Object.entries(SECTIONS).map(([type, section]) => {
      const isAccessible = access[type]?.read;
      const Icon = section.icon;
      return isAccessible ? (
        <Link
          key={type}
          to={`/admin/users/${type}`}
          className={`inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeType === type
              ? 'bg-brand-primary text-white shadow-sm'
              : 'border border-brand-primary/15 bg-white text-brand-primary hover:border-brand-primary/40'
          }`}
        >
          <Icon size={17} className="mr-2" />
          {section.label}
        </Link>
      ) : null;
    })}
  </nav>
);

const AdminUserManagementPage = ({ accountType }) => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const section = SECTIONS[accountType] || SECTIONS.customers;
  const access = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(SECTIONS).map((type) => [type, getSectionAccess(userInfo, type)])
      ),
    [userInfo]
  );
  const currentAccess = access[accountType] || { read: false, manage: false };
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUserId, setEditingUserId] = useState('');
  const [form, setForm] = useState(() => createInitialForm(accountType));

  const config = useMemo(
    () => ({ headers: { Authorization: `Bearer ${userInfo?.token}` } }),
    [userInfo?.token]
  );

  const loadUsers = useCallback(
    async (page = 1) => {
      if (!userInfo?.token || !currentAccess.read) return;

      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`/api/admin/users/${accountType}`, {
          ...config,
          params: { page, limit: 20, ...appliedFilters },
        });
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Unable to load user accounts.');
      } finally {
        setLoading(false);
      }
    },
    [accountType, appliedFilters, config, currentAccess.read, userInfo?.token]
  );

  useEffect(() => {
    if (!userInfo?.token) {
      navigate(`/login?redirect=${encodeURIComponent(`/admin/users/${accountType}`)}`);
      return;
    }
    if (!currentAccess.read) {
      navigate('/admin');
      return;
    }
    const loadTimer = window.setTimeout(() => {
      void loadUsers(1);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [accountType, currentAccess.read, loadUsers, navigate, userInfo?.token]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const beginCreate = () => {
    setError('');
    setSuccess('');
    setSelectedUser(null);
    setEditingUserId('');
    setForm(createInitialForm(accountType));
  };

  const viewUser = async (userId, edit = false) => {
    setActionKey(`view:${userId}`);
    setError('');
    try {
      const { data } = await axios.get(`/api/admin/users/${accountType}/${userId}`, config);
      setSelectedUser(data);
      if (edit) {
        setEditingUserId(data._id);
        setForm({
          ...createInitialForm(accountType),
          ...data,
          password: '',
          staffPermissions: data.staffPermissions || [],
        });
      }
    } catch (viewError) {
      setError(viewError.response?.data?.message || 'Unable to load this user account.');
    } finally {
      setActionKey('');
    }
  };

  const togglePermission = (permission) => {
    updateForm(
      'staffPermissions',
      form.staffPermissions.includes(permission)
        ? form.staffPermissions.filter((item) => item !== permission)
        : [...form.staffPermissions, permission]
    );
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!currentAccess.manage) return;

    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      countryCode: form.countryCode,
      countryName: form.countryName,
      preferredCurrency: form.preferredCurrency,
      password: form.password,
      accountStatus: form.accountStatus,
      ...(accountType === 'staff'
        ? {
            role: form.role,
            staffStatus: form.staffStatus,
            staffPermissions: form.staffPermissions,
          }
        : {}),
    };

    try {
      const { data } = editingUserId
        ? await axios.put(`/api/admin/users/${accountType}/${editingUserId}`, payload, config)
        : await axios.post(`/api/admin/users/${accountType}`, payload, config);
      setSelectedUser(data);
      setSuccess(`${section.label.slice(0, -1)} account ${editingUserId ? 'updated' : 'created'} successfully.`);
      setEditingUserId(data._id);
      setForm({ ...createInitialForm(accountType), ...data, password: '', staffPermissions: data.staffPermissions || [] });
      await loadUsers(editingUserId ? pagination.page : 1);
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save this user account.');
    } finally {
      setSaving(false);
    }
  };

  const runAccountAction = async (user, action) => {
    const actionLabel = action === 'unlock' ? 'clear the login lock for' : 'end all active sessions for';
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${user.name}?`)) return;

    const key = `${action}:${user._id}`;
    setActionKey(key);
    setError('');
    setSuccess('');
    try {
      const { data } = await axios.post(`/api/admin/users/${accountType}/${user._id}/${action === 'unlock' ? 'unlock' : 'revoke-sessions'}`, {}, config);
      setSuccess(data.message || 'Account action completed.');
      if (action === 'unlock' && data.user) setSelectedUser(data.user);
      await loadUsers(pagination.page);
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Unable to complete this account action.');
    } finally {
      setActionKey('');
    }
  };

  const submitFilters = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const Icon = section.icon;
  const sectionLabel = section.label.slice(0, -1);

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <Link to="/admin" className="inline-flex items-center text-sm font-semibold text-brand-primary">
          <ArrowLeft size={16} className="mr-2" /> Back to Admin
        </Link>

        <div className="mt-6 rounded-[28px] bg-brand-dark px-6 py-10 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-accent">User Management</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold">{section.label}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{section.description}</p>
            </div>
            <Icon size={44} className="text-brand-accent" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-6">
          <SectionNav activeType={accountType} access={access} />
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <form onSubmit={submitFilters} className="flex flex-1 flex-col gap-3 sm:flex-row">
                <label className="flex-1">
                  <span className="sr-only">Search {section.label}</span>
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search by name, email, or phone"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-brand-primary"
                  />
                </label>
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-primary"
                  aria-label="Filter by account status"
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
                <button type="submit" className="rounded-xl border border-brand-primary/20 px-4 py-3 text-sm font-bold text-brand-primary">
                  Filter
                </button>
              </form>
              {currentAccess.manage && (
                <button type="button" onClick={beginCreate} className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark">
                  <UserCog size={17} className="mr-2" /> Add {sectionLabel}
                </button>
              )}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase tracking-[0.14em] text-gray-500">
                  <tr>
                    <th className="px-3 py-3 font-bold">User</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-3 py-3 font-bold">Role</th>
                    <th className="px-3 py-3 font-bold">Created</th>
                    <th className="px-3 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="px-3 py-12 text-center text-gray-500"><Loader2 className="mx-auto mb-2 animate-spin text-brand-primary" size={22} /> Loading users…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan="5" className="px-3 py-12 text-center text-gray-500">No {section.label.toLowerCase()} match the current filter.</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-4"><p className="font-semibold text-brand-dark">{user.name}</p><p className="mt-1 text-xs text-gray-500">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p></td>
                        <td className="px-3 py-4"><StatusBadge status={user.accountStatus} /></td>
                        <td className="px-3 py-4 text-gray-600">{accountType === 'staff' ? user.role.replaceAll('_', ' ') : accountType === 'admins' ? 'Administrator' : user.isVendor ? 'Customer / Vendor' : 'Customer'}</td>
                        <td className="px-3 py-4 text-xs text-gray-500">{formatDate(user.createdAt)}</td>
                        <td className="px-3 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => viewUser(user._id)} className="rounded-lg border border-brand-primary/15 p-2 text-brand-primary" aria-label={`View ${user.name}`}>{actionKey === `view:${user._id}` ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}</button>{currentAccess.manage && <button type="button" onClick={() => viewUser(user._id, true)} className="rounded-lg border border-brand-primary/15 px-3 py-2 text-xs font-bold text-brand-primary">Edit</button>}</div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-500">
              <span>{pagination.total} total</span>
              <div className="flex items-center gap-2"><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => loadUsers(pagination.page - 1)} className="rounded-lg border border-gray-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span>Page {pagination.page} of {pagination.totalPages}</span><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => loadUsers(pagination.page + 1)} className="rounded-lg border border-gray-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div>
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">{editingUserId ? `Edit ${sectionLabel}` : `Add ${sectionLabel}`}</p><h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">{editingUserId ? form.name || sectionLabel : `New ${sectionLabel}`}</h2></div>
              {(editingUserId || selectedUser) && <button type="button" onClick={beginCreate} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-primary" aria-label="Close editor"><X size={18} /></button>}
            </div>

            {currentAccess.manage ? (
              <form className="mt-5 space-y-4" onSubmit={saveUser}>
                <label className="block text-sm font-semibold text-brand-dark">Name<input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
                <label className="block text-sm font-semibold text-brand-dark">Email<input required type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
                <label className="block text-sm font-semibold text-brand-dark">Phone<input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-brand-dark">Country code<input value={form.countryCode} onChange={(event) => updateForm('countryCode', event.target.value.toUpperCase())} maxLength="2" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label><label className="block text-sm font-semibold text-brand-dark">Currency<select value={form.preferredCurrency} onChange={(event) => updateForm('preferredCurrency', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal"><option>LKR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option></select></label></div>
                <label className="block text-sm font-semibold text-brand-dark">Country<input value={form.countryName} onChange={(event) => updateForm('countryName', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
                <label className="block text-sm font-semibold text-brand-dark">{editingUserId ? 'New password (optional)' : 'Temporary password'}<input required={!editingUserId} type="password" minLength="6" value={form.password} onChange={(event) => updateForm('password', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>
                <label className="block text-sm font-semibold text-brand-dark">Account status<select value={form.accountStatus} onChange={(event) => updateForm('accountStatus', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal"><option>Active</option><option>Suspended</option></select></label>

                {accountType === 'staff' && <><label className="block text-sm font-semibold text-brand-dark">Staff role<select value={form.role} onChange={(event) => updateForm('role', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal">{STAFF_ROLES.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label><label className="block text-sm font-semibold text-brand-dark">Staff status<select value={form.staffStatus} onChange={(event) => updateForm('staffStatus', event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal"><option>Active</option><option>Suspended</option></select></label><fieldset><legend className="text-sm font-semibold text-brand-dark">Additional permissions</legend><div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-xl border border-gray-100 p-3">{ALL_PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={form.staffPermissions.includes(permission)} onChange={() => togglePermission(permission)} />{permission}</label>)}</div></fieldset></>}

                <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="mr-2 animate-spin" size={17} /> : <Save className="mr-2" size={17} />}{editingUserId ? 'Save Changes' : `Create ${sectionLabel}`}</button>
              </form>
            ) : selectedUser ? (
              <div className="mt-5 text-sm text-gray-600">You can view this account but do not have permission to change it.</div>
            ) : (
              <div className="mt-5 text-sm text-gray-600">Select a user to view their profile.</div>
            )}

            {selectedUser && <div className="mt-6 border-t border-gray-100 pt-5"><h3 className="font-serif text-lg font-bold text-brand-dark">Account details</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-gray-500">Signed in</dt><dd className="text-right text-gray-700">{formatDate(selectedUser.security?.lastLoginAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Login lock</dt><dd className="text-right text-gray-700">{selectedUser.security?.accountLockedUntil ? `Until ${formatDate(selectedUser.security.accountLockedUntil)}` : 'None'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Authentication</dt><dd className="text-right text-gray-700">{selectedUser.authMethods?.join(', ') || 'Not recorded'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Saved addresses</dt><dd className="text-right text-gray-700">{selectedUser.addresses?.length || 0}</dd></div></dl>{currentAccess.manage && <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => runAccountAction(selectedUser, 'unlock')} disabled={Boolean(actionKey)} className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-3 py-2.5 text-xs font-bold text-brand-primary disabled:opacity-50">{actionKey === `unlock:${selectedUser._id}` ? <Loader2 className="mr-2 animate-spin" size={15} /> : <KeyRound className="mr-2" size={15} />}Unlock account</button><button type="button" onClick={() => runAccountAction(selectedUser, 'revoke')} disabled={Boolean(actionKey)} className="rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50">{actionKey === `revoke:${selectedUser._id}` ? 'Ending sessions…' : 'End sessions'}</button></div>}</div>}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagementPage;
