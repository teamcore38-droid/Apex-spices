import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../../models/userModel.js';
import userManagementRoutes from '../../routes/userManagementRoutes.js';
import {
  buildListFilter,
  serializeManagedUser,
} from '../../controllers/userManagementController.js';
import { updateStaffStatus, upsertStaffUser } from '../../controllers/proAdminController.js';
import { requireUserManagementAccess } from '../../middleware/userManagementMiddleware.js';
import { hasPermission, PERMISSIONS } from '../../utils/permissions.js';
import { isAccountSuspended } from '../../utils/securityService.js';

const invokeAccessMiddleware = async (user, type, mode) => {
  let nextCalled = false;
  let responseStatus = 200;
  let responseBody;
  const response = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await requireUserManagementAccess(mode)(
    { params: { type }, user },
    response,
    () => {
      nextCalled = true;
    }
  );

  return { nextCalled, responseStatus, responseBody };
};

const createListQuery = (value) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => value,
});

test('user-management filters combine account type, search, and suspension status safely', () => {
  const filter = buildListFilter('staff', { search: 'ops+team', status: 'Suspended' });

  assert.equal(filter.isStaff, true);
  assert.deepEqual(filter.isAdmin, { $ne: true });
  assert.equal(filter.$and.length, 2);
  assert.equal(filter.$and[0].$or[0].name.test('Ops+Team'), true);
  assert.equal(filter.$and[0].$or[0].name.test('Ops Team'), false);
  assert.deepEqual(filter.$and[1], {
    $or: [{ accountStatus: 'Suspended' }, { staffStatus: 'Suspended' }],
  });
});

test('managed-user serialization never exposes credentials or login identifiers', () => {
  const result = serializeManagedUser(
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Managed Customer',
      email: 'managed@example.com',
      password: 'hashed-password',
      googleSubject: 'google-subject',
      googleEmail: 'managed@gmail.com',
      resetPasswordToken: 'reset-token',
      isAdmin: false,
      isStaff: false,
      role: 'customer',
      addresses: [],
      security: {
        lastLoginIp: '192.0.2.1',
        lastLoginUserAgent: 'test-agent',
        adminTwoFactorEnabled: true,
      },
    },
    { detail: true }
  );

  assert.equal(result.password, undefined);
  assert.equal(result.googleSubject, undefined);
  assert.equal(result.googleEmail, undefined);
  assert.equal(result.resetPasswordToken, undefined);
  assert.equal(result.security.lastLoginIp, undefined);
  assert.equal(result.security.lastLoginUserAgent, undefined);
  assert.deepEqual(result.authMethods, ['Password']);

  assert.deepEqual(
    serializeManagedUser({
      name: 'Google Customer',
      email: 'google@example.com',
      googleLinkedAt: new Date(),
      isAdmin: false,
      isStaff: false,
    }).authMethods,
    ['Google']
  );
});

test('user-management access separates administrators from delegated managers', async () => {
  const manager = {
    isAdmin: false,
    isStaff: true,
    role: 'user_manager',
    staffStatus: 'Active',
    accountStatus: 'Active',
  };

  const customerRead = await invokeAccessMiddleware(manager, 'customers', 'read');
  assert.equal(customerRead.nextCalled, true);

  const customerManage = await invokeAccessMiddleware(manager, 'customers', 'manage');
  assert.equal(customerManage.nextCalled, true);

  const staffManage = await invokeAccessMiddleware(manager, 'staff', 'manage');
  assert.equal(staffManage.nextCalled, false);
  assert.equal(staffManage.responseStatus, 403);

  const adminManage = await invokeAccessMiddleware(manager, 'admins', 'manage');
  assert.equal(adminManage.nextCalled, false);
  assert.equal(adminManage.responseStatus, 403);

  const admin = { isAdmin: true, accountStatus: 'Active', staffStatus: 'Active' };
  const adminManageAllowed = await invokeAccessMiddleware(admin, 'admins', 'manage');
  assert.equal(adminManageAllowed.nextCalled, true);

  const suspended = { ...manager, accountStatus: 'Suspended' };
  assert.equal(isAccountSuspended(suspended), true);
  assert.equal(hasPermission(suspended, PERMISSIONS.USERS_READ), false);
});

test('legacy staff management cannot grant or edit administrator accounts', async (t) => {
  const originalFindById = User.findById;
  t.after(() => {
    User.findById = originalFindById;
  });

  const managerRequest = {
    user: {
      _id: new mongoose.Types.ObjectId(),
      isAdmin: false,
      isStaff: true,
      role: 'user_manager',
      staffStatus: 'Active',
    },
    body: {
      name: 'Escalation Attempt',
      email: 'escalation@example.com',
      password: 'valid-password',
      isAdmin: true,
    },
    params: {},
  };
  let responseStatus = 200;
  const response = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json() {
      return this;
    },
  };

  await upsertStaffUser(managerRequest, response);
  assert.equal(responseStatus, 403);

  User.findById = async () => ({
    _id: new mongoose.Types.ObjectId(),
    isAdmin: true,
    isStaff: true,
  });
  responseStatus = 200;
  const adminId = new mongoose.Types.ObjectId().toString();
  await upsertStaffUser(
    {
      ...managerRequest,
      body: { ...managerRequest.body, id: adminId, isAdmin: false },
    },
    response
  );
  assert.equal(responseStatus, 403);

  responseStatus = 200;
  await updateStaffStatus(
    {
      user: managerRequest.user,
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { staffStatus: 'Active' },
    },
    response
  );
  assert.equal(responseStatus, 403);
});

test('GET /api/admin/users/:type uses the real auth and user-management route chain', async (t) => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'user-management-route-test-secret';

  const restore = [];
  const mockMethod = (target, name, implementation) => {
    const original = target[name];
    target[name] = implementation;
    restore.push(() => {
      target[name] = original;
    });
  };
  t.after(() => {
    restore.reverse().forEach((restoreMethod) => restoreMethod());
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  const managerId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const manager = {
    _id: managerId,
    name: 'User Manager',
    email: 'manager@example.com',
    isAdmin: false,
    isStaff: true,
    role: 'user_manager',
    staffStatus: 'Active',
    accountStatus: 'Active',
  };
  const customer = {
    _id: customerId,
    name: 'Route Customer',
    email: 'route-customer@example.com',
    password: 'should-not-be-returned',
    isAdmin: false,
    isStaff: false,
    role: 'customer',
    accountStatus: 'Active',
    addresses: [],
  };

  mockMethod(User, 'findById', () => ({ select: async () => manager }));
  mockMethod(User, 'find', () => createListQuery([customer]));
  mockMethod(User, 'countDocuments', async () => 1);

  const app = express();
  app.use(express.json());
  app.use('/api/admin/users', userManagementRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const managerToken = jwt.sign({ id: managerId.toString() }, process.env.JWT_SECRET);
  const customersResponse = await fetch(`${baseUrl}/api/admin/users/customers`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const customersBody = await customersResponse.json();

  assert.equal(customersResponse.status, 200, JSON.stringify(customersBody));
  assert.equal(customersBody.users.length, 1);
  assert.equal(customersBody.users[0].password, undefined);

  const adminsResponse = await fetch(`${baseUrl}/api/admin/users/admins`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert.equal(adminsResponse.status, 403);

  User.findById = () => ({
    select: async () => ({ ...manager, accountStatus: 'Suspended' }),
  });
  const suspendedResponse = await fetch(`${baseUrl}/api/admin/users/customers`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert.equal(suspendedResponse.status, 403);
});
