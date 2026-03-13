import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await db.query(
      `SELECT u.id, u.org_id, u.email, u.first_name, u.last_name, u.is_active,
              o.org_type, o.slug as org_slug, o.name as org_name
       FROM users u JOIN organizations o ON u.org_id = o.id
       WHERE u.id = $1 AND u.is_active = true AND o.is_active = true`,
      [decoded.userId]
    );

    if (!rows.length) return res.status(401).json({ error: 'User not found or inactive' });

    req.user = rows[0];
    req.orgId = rows[0].org_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requirePermission = (permission) => async (req, res, next) => {
  const { rows } = await db.query(
    `SELECT p.code FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = $1 AND p.code = $2`,
    [req.user.id, permission]
  );

  if (!rows.length) {
    return res.status(403).json({ error: `Permission required: ${permission}` });
  }
  next();
};

export const requireOrgType = (...types) => (req, res, next) => {
  if (!types.includes(req.user.org_type)) {
    return res.status(403).json({ error: 'This action is not allowed for your organization type' });
  }
  next();
};
