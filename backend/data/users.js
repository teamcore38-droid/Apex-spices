import bcrypt from 'bcryptjs';

const users = [
  // Development/staging bootstrap users only. Rotate credentials before production.
  {
    name: 'Apex Spices Admin',
    email: 'admin@apexspices.com',
    password: bcrypt.hashSync('ApexSpicesAdmin2026!', 10),
    isAdmin: true,
    security: {
      adminTwoFactorEnabled: false,
    },
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: bcrypt.hashSync('password123', 10),
  },
];

export default users;
