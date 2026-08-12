import { hasPermission, PERMISSIONS } from '../utils/permissions.js';

const USER_MANAGEMENT_TYPES = ['customers', 'staff', 'admins'];

const getManagementPermission = (type, mode = 'read') => {
  if (type === 'customers') {
    return mode === 'manage' ? PERMISSIONS.USERS_MANAGE : PERMISSIONS.USERS_READ;
  }

  if (type === 'staff') {
    return PERMISSIONS.STAFF_MANAGE;
  }

  return '';
};

const requireUserManagementAccess = (mode = 'read') => (req, res, next) => {
  const type = String(req.params.type || '').trim().toLowerCase();

  if (!USER_MANAGEMENT_TYPES.includes(type)) {
    return res.status(404).json({ message: 'Unknown user-management section' });
  }

  if (type === 'admins') {
    if (req.user?.isAdmin) {
      return next();
    }

    return res.status(403).json({ message: 'Only administrators can manage administrator accounts' });
  }

  if (hasPermission(req.user, getManagementPermission(type, mode))) {
    return next();
  }

  return res.status(403).json({ message: 'Not authorized for this user-management action' });
};

export { USER_MANAGEMENT_TYPES, getManagementPermission, requireUserManagementAccess };
