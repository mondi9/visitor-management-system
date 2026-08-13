export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  RECEPTIONIST: 'receptionist',
  SECURITY_OFFICER: 'security-officer',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.RECEPTIONIST]: 'Receptionist',
  [ROLES.SECURITY_OFFICER]: 'Security Officer',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: 'Full access to every module, including user management and settings.',
  [ROLES.RECEPTIONIST]: 'Runs the front desk: check-ins, pre-registrations, hosts, contractors and deliveries.',
  [ROLES.SECURITY_OFFICER]: 'Monitor the live visitor board, view visitor history and export reports.',
};

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: 'bg-indigo-50 text-indigo-600',
  [ROLES.RECEPTIONIST]: 'bg-blue-50 text-blue-600',
  [ROLES.SECURITY_OFFICER]: 'bg-emerald-50 text-emerald-600',
};

// Which roles can see each sidebar item / route.
export const ROUTE_ACCESS = {
  '/admin': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.SECURITY_OFFICER],
  '/admin/visitors': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.SECURITY_OFFICER],
  '/admin/frequent-visitors': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  '/admin/pre-registrations': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  '/admin/hosts': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  '/admin/contractors': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  '/admin/deliveries': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST],
  '/admin/reports': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.SECURITY_OFFICER],
  '/admin/settings': [ROLES.SUPER_ADMIN],
  '/admin/users': [ROLES.SUPER_ADMIN],
  '/admin/notifications': [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.SECURITY_OFFICER],
};

export const getRoleAccess = (path) => ROUTE_ACCESS[path] || [ROLES.SUPER_ADMIN];

export const isRoleAllowed = (role, path) =>
  Boolean(role) && getRoleAccess(path).includes(role);
