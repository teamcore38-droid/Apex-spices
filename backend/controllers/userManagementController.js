import mongoose from 'mongoose';
import RefreshToken from '../models/refreshTokenModel.js';
import User from '../models/userModel.js';
import { getSupportedCurrencyForCountry, resolveSupportedCurrency } from '../utils/currencyService.js';
import { recordAuditLog } from '../utils/auditService.js';
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForUser,
  normalizePermissionList,
} from '../utils/permissions.js';
import { recordSecurityEvent } from '../utils/securityService.js';

const ACCOUNT_TYPES = ['customers', 'staff', 'admins'];
const ACCOUNT_STATUS_VALUES = ['Active', 'Suspended'];
const STAFF_STATUS_VALUES = ['Active', 'Suspended'];
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MANAGED_USER_SELECT =
  '-password -googleSubject -googleEmail -resetPasswordToken -resetPasswordExpire -security.lastLoginIp -security.lastLoginUserAgent';
const MANAGED_MUTATION_SELECT =
  `${MANAGED_USER_SELECT.replace('-password ', '')} +password`;

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeAccountStatus = (value, fallback = 'Active') =>
  ACCOUNT_STATUS_VALUES.includes(String(value || '').trim()) ? String(value).trim() : fallback;
const normalizeStaffStatus = (value, fallback = 'Active') =>
  STAFF_STATUS_VALUES.includes(String(value || '').trim()) ? String(value).trim() : fallback;
const isSuspended = (user = {}) =>
  user.accountStatus === 'Suspended' ||
  ((user.isStaff || user.isAdmin) && user.staffStatus === 'Suspended');

const getTypeFilter = (type) => {
  if (type === 'customers') {
    return { isAdmin: { $ne: true }, isStaff: { $ne: true } };
  }

  if (type === 'staff') {
    return { isStaff: true, isAdmin: { $ne: true } };
  }

  if (type === 'admins') {
    return { isAdmin: true };
  }

  return null;
};

const getAccountType = (user = {}) => {
  if (user.isAdmin) return 'admins';
  if (user.isStaff) return 'staff';
  return 'customers';
};

const getAuthMethods = (user = {}) => [
  ...(user?.googleLinkedAt ? ['Google'] : []),
  ...(user?.password || !user?.googleLinkedAt ? ['Password'] : []),
];

const serializeManagedUser = (user, { detail = false } = {}) => {
  const source = user?.toObject ? user.toObject() : user || {};
  const accountType = getAccountType(source);
  const accountSuspended = isSuspended(source);

  const response = {
    _id: source._id,
    accountType,
    name: source.name || '',
    email: source.email || '',
    phone: source.phone || '',
    countryCode: source.countryCode || 'LK',
    countryName: source.countryName || 'Sri Lanka',
    preferredCurrency: resolveSupportedCurrency(
      source.preferredCurrency || getSupportedCurrencyForCountry(source.countryCode || 'LK')
    ),
    accountStatus: accountSuspended ? 'Suspended' : 'Active',
    staffStatus: source.staffStatus || 'Active',
    isAdmin: Boolean(source.isAdmin),
    isStaff: Boolean(source.isStaff),
    isVendor: Boolean(source.isVendor),
    vendorStatus: source.vendorStatus || 'None',
    role: source.role || (source.isAdmin ? 'admin' : source.isStaff ? 'custom' : 'customer'),
    staffPermissions: Array.isArray(source.staffPermissions) ? source.staffPermissions : [],
    permissions: getPermissionsForUser(source),
    authMethods: getAuthMethods(source),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
    security: {
      adminTwoFactorEnabled: source.security?.adminTwoFactorEnabled !== false,
      lastLoginAt: source.security?.lastLoginAt || null,
      accountLockedUntil: source.security?.accountLockedUntil || null,
    },
  };

  if (detail) {
    response.addresses = Array.isArray(source.addresses) ? source.addresses : [];
    response.notificationPreferences = source.notificationPreferences || {};
  } else {
    response.addressCount = Array.isArray(source.addresses) ? source.addresses.length : 0;
  }

  return response;
};

const getRequestedType = (req) => String(req.params.type || '').trim().toLowerCase();

const getPagination = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(10, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const buildListFilter = (type, query = {}) => {
  const typeFilter = getTypeFilter(type);
  const filter = { ...typeFilter };
  const conditions = [];
  const search = String(query.search || '').trim().slice(0, 100);
  const status = String(query.status || '').trim();

  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    conditions.push({ $or: [{ name: expression }, { email: expression }, { phone: expression }] });
  }

  if (ACCOUNT_STATUS_VALUES.includes(status)) {
    if (status === 'Suspended') {
      conditions.push({
        $or: [
        { accountStatus: 'Suspended' },
        ...(type === 'staff' ? [{ staffStatus: 'Suspended' }] : []),
        ],
      });
    } else {
      filter.accountStatus = { $ne: 'Suspended' };
      if (type === 'staff') filter.staffStatus = { $ne: 'Suspended' };
    }
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  return filter;
};

const normalizeProfile = (payload = {}, { requirePassword = false } = {}) => {
  const name = String(payload.name || '').trim().slice(0, 120);
  const email = String(payload.email || '').trim().toLowerCase().slice(0, 160);
  const password = String(payload.password || '');

  if (!name) throw new Error('Name is required');
  if (!EMAIL_PATTERN.test(email)) throw new Error('Please enter a valid email address');
  if (requirePassword && password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  if (!requirePassword && password && password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  const countryCode = String(payload.countryCode || 'LK').trim().toUpperCase().slice(0, 2) || 'LK';
  const countryName = String(payload.countryName || 'Sri Lanka').trim().slice(0, 100) || 'Sri Lanka';

  return {
    name,
    email,
    phone: String(payload.phone || '').trim().slice(0, 50),
    countryCode,
    countryName,
    preferredCurrency: resolveSupportedCurrency(
      payload.preferredCurrency || getSupportedCurrencyForCountry(countryCode)
    ),
    ...(password ? { password } : {}),
  };
};

const getStaffConfiguration = (payload = {}) => {
  const requestedRole = String(payload.role || 'custom').trim();
  const role =
    ROLE_PERMISSIONS[requestedRole] && !['owner', 'admin'].includes(requestedRole)
      ? requestedRole
      : 'custom';

  return {
    role,
    staffPermissions: normalizePermissionList(payload.staffPermissions).filter((permission) =>
      ALL_PERMISSIONS.includes(permission)
    ),
    staffStatus: normalizeStaffStatus(payload.staffStatus),
  };
};

const findManagedUser = async (type, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findOne({ _id: id, ...getTypeFilter(type) }).select(MANAGED_USER_SELECT);
};

const findManagedUserForMutation = async (type, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findOne({ _id: id, ...getTypeFilter(type) }).select(MANAGED_MUTATION_SELECT);
};

const ensureEmailIsAvailable = async (email, userId = null) => {
  const existing = await User.findOne({ email, ...(userId ? { _id: { $ne: userId } } : {}) });
  if (existing) {
    const error = new Error('An account already exists with that email');
    error.statusCode = 409;
    throw error;
  }
};

const preventLastActiveAdminSuspension = async (req, user, nextStatus) => {
  if (!user.isAdmin || nextStatus !== 'Suspended') return;
  if (String(user._id) === String(req.user?._id)) {
    const error = new Error('You cannot suspend your own administrator account');
    error.statusCode = 400;
    throw error;
  }

  const otherActiveAdmins = await User.countDocuments({
    isAdmin: true,
    $and: [
      { accountStatus: { $ne: 'Suspended' } },
      { staffStatus: { $ne: 'Suspended' } },
    ],
    _id: { $ne: user._id },
  });
  if (otherActiveAdmins === 0) {
    const error = new Error('At least one active administrator account is required');
    error.statusCode = 400;
    throw error;
  }
};

const revokeActiveSessions = async (userId) =>
  RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });

const listManagedUsers = async (req, res) => {
  const type = getRequestedType(req);
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildListFilter(type, req.query);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(MANAGED_USER_SELECT)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    users: users.map((user) => serializeManagedUser(user)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    accountType: type,
  });
};

const getManagedUser = async (req, res) => {
  const type = getRequestedType(req);
  const user = await findManagedUser(type, req.params.id);
  if (!user) return res.status(404).json({ message: 'User account not found' });
  return res.json(serializeManagedUser(user, { detail: true }));
};

const createManagedUser = async (req, res) => {
  const type = getRequestedType(req);

  try {
    const profile = normalizeProfile(req.body, { requirePassword: true });
    await ensureEmailIsAvailable(profile.email);

    const user = new User(profile);
    if (type === 'customers') {
      user.isAdmin = false;
      user.isStaff = false;
      user.role = 'customer';
      user.staffPermissions = [];
      user.staffStatus = 'Active';
    } else if (type === 'staff') {
      const staff = getStaffConfiguration(req.body);
      user.isAdmin = false;
      user.isStaff = true;
      user.role = staff.role;
      user.staffPermissions = staff.staffPermissions;
      user.staffStatus = staff.staffStatus;
    } else {
      user.isAdmin = true;
      user.isStaff = true;
      user.role = 'admin';
      user.staffPermissions = [];
      user.staffStatus = 'Active';
    }

    user.accountStatus = normalizeAccountStatus(req.body.accountStatus);
    if (user.isStaff && user.staffStatus === 'Suspended') user.accountStatus = 'Suspended';
    const savedUser = await user.save();

    if (isSuspended(savedUser)) await revokeActiveSessions(savedUser._id);
    await recordAuditLog(req, 'users.create', 'User', savedUser._id, {
      accountType: type,
      accountStatus: savedUser.accountStatus,
      role: savedUser.role,
    });
    await recordSecurityEvent(req, 'account.created.by-admin', savedUser, { accountType: type });
    return res.status(201).json(serializeManagedUser(savedUser, { detail: true }));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account already exists with that email' });
    return res.status(error.statusCode || 400).json({ message: error.message || 'Unable to create user account' });
  }
};

const updateManagedUser = async (req, res) => {
  const type = getRequestedType(req);

  try {
    const user = await findManagedUserForMutation(type, req.params.id);
    if (!user) return res.status(404).json({ message: 'User account not found' });

    const profile = normalizeProfile(req.body);
    await ensureEmailIsAvailable(profile.email, user._id);
    Object.assign(user, profile);

    const nextAccountStatus = normalizeAccountStatus(req.body.accountStatus, user.accountStatus || 'Active');
    await preventLastActiveAdminSuspension(req, user, nextAccountStatus);
    user.accountStatus = nextAccountStatus;

    if (type === 'staff') {
      const staff = getStaffConfiguration(req.body);
      user.role = staff.role;
      user.staffPermissions = staff.staffPermissions;
      user.staffStatus = staff.staffStatus;
      if (staff.staffStatus === 'Suspended') user.accountStatus = 'Suspended';
    }
    if (type === 'admins') {
      user.isAdmin = true;
      user.isStaff = true;
      user.role = 'admin';
      user.staffPermissions = [];
      user.staffStatus = 'Active';
    }

    const wasSuspended = isSuspended(user);
    const savedUser = await user.save();
    if (wasSuspended) await revokeActiveSessions(savedUser._id);

    await recordAuditLog(req, 'users.update', 'User', savedUser._id, {
      accountType: type,
      accountStatus: serializeManagedUser(savedUser).accountStatus,
      role: savedUser.role,
    });
    if (wasSuspended) {
      await recordSecurityEvent(req, 'account.suspended.by-admin', savedUser, { accountType: type }, 'warning');
    }
    return res.json(serializeManagedUser(savedUser, { detail: true }));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An account already exists with that email' });
    return res.status(error.statusCode || 400).json({ message: error.message || 'Unable to update user account' });
  }
};

const unlockManagedUser = async (req, res) => {
  const type = getRequestedType(req);
  const user = await findManagedUserForMutation(type, req.params.id);
  if (!user) return res.status(404).json({ message: 'User account not found' });

  user.security = {
    ...user.security,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
  };
  await user.save({ validateBeforeSave: false });
  await recordAuditLog(req, 'users.unlock', 'User', user._id, { accountType: type });
  await recordSecurityEvent(req, 'account.unlocked.by-admin', user, { accountType: type });
  return res.json({ message: 'Account login lock cleared', user: serializeManagedUser(user, { detail: true }) });
};

const revokeManagedUserSessions = async (req, res) => {
  const type = getRequestedType(req);
  const user = await findManagedUserForMutation(type, req.params.id);
  if (!user) return res.status(404).json({ message: 'User account not found' });

  await revokeActiveSessions(user._id);
  await recordAuditLog(req, 'users.sessions.revoke', 'User', user._id, { accountType: type });
  await recordSecurityEvent(req, 'account.sessions.revoked.by-admin', user, { accountType: type }, 'warning');
  return res.json({ message: 'Active sessions revoked' });
};

export {
  ACCOUNT_TYPES,
  buildListFilter,
  createManagedUser,
  getAccountType,
  getManagedUser,
  getTypeFilter,
  listManagedUsers,
  serializeManagedUser,
  unlockManagedUser,
  updateManagedUser,
  revokeManagedUserSessions,
};
