// Agency-side client management routes
// Allows staffing agencies to onboard and manage their client organizations

import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission, requireOrgType } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(authenticate);
router.use(requireOrgType('staffing_agency'));

// GET /api/clients — list all clients onboarded to this agency
router.get('/', requirePermission('MANAGE_CLIENTS'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let where = `cr.agency_org_id = $1`;
    const params = [req.orgId];
    let idx = 2;

    if (status) { where += ` AND cr.status = $${idx++}`; params.push(status); }
    if (search) { where += ` AND o.name ILIKE $${idx++}`; params.push(`%${search}%`); }

    const { rows } = await db.query(
      `SELECT o.id, o.name, o.slug, o.domain, o.logo_url, o.website, o.settings, o.is_active,
              cr.client_code, cr.status as relationship_status, cr.contract_start, cr.contract_end,
              cr.onboarded_by, cr.created_at as onboarded_at,
              u.first_name || ' ' || u.last_name as onboarded_by_name,
              (SELECT COUNT(*) FROM jobs j WHERE j.client_org_id = o.id AND j.org_id = $1) as job_count,
              (SELECT COUNT(*) FROM jobs j
               JOIN submissions s ON s.job_id = j.id
               WHERE j.client_org_id = o.id AND j.org_id = $1) as submission_count
       FROM client_relationships cr
       JOIN organizations o ON o.id = cr.client_org_id
       LEFT JOIN users u ON u.id = cr.onboarded_by
       WHERE ${where}
       ORDER BY cr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM client_relationships cr
       JOIN organizations o ON o.id = cr.client_org_id
       WHERE ${where}`,
      params
    );

    res.json({ clients: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id — get single client detail
router.get('/:id', requirePermission('MANAGE_CLIENTS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, cr.client_code, cr.status as relationship_status,
              cr.contract_start, cr.contract_end, cr.contract_type, cr.net_payment_terms,
              cr.notes, cr.account_manager_id, cr.terms,
              cr.created_at as onboarded_at,
              (SELECT COUNT(*) FROM jobs j WHERE j.client_org_id = o.id AND j.org_id = $2) as job_count
       FROM organizations o
       JOIN client_relationships cr ON cr.client_org_id = o.id
       WHERE o.id = $1 AND cr.agency_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients — onboard a new client organization
router.post('/', requirePermission('MANAGE_CLIENTS'), async (req, res) => {
  try {
    const {
      name, phone, website, industry, company_size,
      address_street, address_suite, address_city, address_state,
      address_zip, address_country,
      ein, contract_type, net_payment_terms, contract_start, contract_end,
      account_manager_id, notes,
      poc_first_name, poc_last_name, poc_email,
      additional_users = [],
    } = req.body;

    if (!name)      return res.status(400).json({ error: 'Client name is required' });
    if (!poc_email) return res.status(400).json({ error: 'Point of contact email is required' });

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('Password123!', 12);

    const result = await db.transaction(async (conn) => {
      // 1. Create the client organization
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      const { rows: [org] } = await conn.query(
        `INSERT INTO organizations
           (name, slug, org_type, website, phone, industry, company_size,
            address_street, address_suite, address_city, address_state,
            address_zip, address_country, ein)
         VALUES ($1,$2,'client',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [name, slug, website || null, phone || null, industry || null, company_size || null,
         address_street || null, address_suite || null, address_city || null, address_state || null,
         address_zip || null, address_country || 'US', ein || null]
      );

      // 2. Create the relationship
      await conn.query(
        `INSERT INTO client_relationships
           (agency_org_id, client_org_id, onboarded_by,
            contract_start, contract_end, contract_type,
            net_payment_terms, account_manager_id, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [req.orgId, org.id, req.user.id,
         contract_start || null, contract_end || null, contract_type || 'both',
         net_payment_terms || 30, account_manager_id || null, notes || null]
      );

      // 3. Create predefined client roles
      const ROLE_PERMISSIONS = {
        'Client Admin':   `('VIEW_CLIENT_PORTAL','CREATE_REQUIREMENT','EDIT_REQUIREMENT','REVIEW_CANDIDATE','APPROVE_CANDIDATE','VIEW_SUBMISSIONS','REQUEST_INTERVIEW','VIEW_NOTIFICATIONS','MANAGE_USERS')`,
        'Hiring Manager': `('VIEW_CLIENT_PORTAL','VIEW_SUBMISSIONS','REVIEW_CANDIDATE','APPROVE_CANDIDATE','REQUEST_INTERVIEW','VIEW_NOTIFICATIONS')`,
        'Viewer':         `('VIEW_CLIENT_PORTAL','VIEW_SUBMISSIONS','VIEW_NOTIFICATIONS')`,
      };

      const createdRoles = {};
      for (const [roleName, permsIn] of Object.entries(ROLE_PERMISSIONS)) {
        const { rows: [role] } = await conn.query(
          `INSERT INTO roles (org_id, name, description) VALUES ($1,$2,$3) RETURNING id`,
          [org.id, roleName, `${roleName} — client portal access`]
        );
        await conn.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT $1, id FROM permissions WHERE code IN ${permsIn}`,
          [role.id]
        );
        createdRoles[roleName] = role.id;
      }

      // 4. Create POC user as Client Admin
      const { rows: [pocUser] } = await conn.query(
        `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified, must_change_password)
         VALUES ($1,$2,$3,$4,$5,true,true) RETURNING id, email, first_name, last_name`,
        [org.id, poc_email.toLowerCase(), passwordHash, poc_first_name || '', poc_last_name || '']
      );
      await conn.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)`, [pocUser.id, createdRoles['Client Admin']]);

      // 5. Create additional users
      const createdUsers = [pocUser];
      for (const u of additional_users) {
        if (!u.email?.trim()) continue;
        const roleId = createdRoles[u.role] || createdRoles['Viewer'];
        const { rows: [newUser] } = await conn.query(
          `INSERT INTO users (org_id, email, password_hash, first_name, last_name, email_verified, must_change_password)
           VALUES ($1,$2,$3,$4,$5,true,true) RETURNING id, email, first_name, last_name`,
          [org.id, u.email.toLowerCase(), passwordHash, u.first_name || '', u.last_name || '']
        );
        await conn.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)`, [newUser.id, roleId]);
        createdUsers.push({ ...newUser, role: u.role });
      }

      return { org, pocUser, createdUsers };
    });

    logAudit(req, 'client.created', 'organization', result.org.id, {
      name: result.org.name, poc_email: result.pocUser.email,
    });
    res.status(201).json({
      organization:  result.org,
      poc_user:      result.pocUser,
      users_created: result.createdUsers.length,
      users:         result.createdUsers,
      temp_password: 'Password123!',
      message: `Client onboarded successfully. All users have temporary password: Password123!`,
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/clients/:id — update client org + relationship
router.patch('/:id', requirePermission('MANAGE_CLIENTS'), async (req, res) => {
  try {
    const {
      name, phone, website, industry, company_size, is_active,
      status, contract_start, contract_end, contract_type, net_payment_terms, notes, account_manager_id, terms,
    } = req.body;

    const orgUpdates = Object.fromEntries(
      Object.entries({ name, phone, website, industry, company_size, is_active }).filter(([, v]) => v !== undefined)
    );
    const relUpdates = Object.fromEntries(
      Object.entries({ status, contract_start, contract_end, contract_type, net_payment_terms, notes, account_manager_id })
        .filter(([, v]) => v !== undefined)
    );
    if (terms !== undefined) relUpdates.terms = JSON.stringify(terms);

    if (!Object.keys(orgUpdates).length && !Object.keys(relUpdates).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.transaction(async (conn) => {
      if (Object.keys(orgUpdates).length) {
        const sets = Object.keys(orgUpdates).map((k, i) => `${k} = $${i + 2}`);
        await conn.query(
          `UPDATE organizations SET ${sets.join(', ')} WHERE id = $1`,
          [req.params.id, ...Object.values(orgUpdates)]
        );
      }
      if (Object.keys(relUpdates).length) {
        const sets = Object.keys(relUpdates).map((k, i) => `${k} = $${i + 3}`);
        const { rows } = await conn.query(
          `UPDATE client_relationships SET ${sets.join(', ')}
           WHERE client_org_id = $1 AND agency_org_id = $2 RETURNING id`,
          [req.params.id, req.orgId, ...Object.values(relUpdates)]
        );
        if (!rows.length) throw Object.assign(new Error('Client not found'), { status: 404 });
      }
    });

    const { rows } = await db.query(
      `SELECT o.id, o.name, o.website, o.phone, o.industry, o.company_size,
              cr.status as relationship_status, cr.contract_start, cr.contract_end,
              cr.contract_type, cr.net_payment_terms, cr.notes, cr.account_manager_id, cr.terms
       FROM organizations o
       JOIN client_relationships cr ON cr.client_org_id = o.id
       WHERE o.id = $1 AND cr.agency_org_id = $2`,
      [req.params.id, req.orgId]
    );
    const auditAction = is_active === true  ? 'client.activated'
      : is_active === false                 ? 'client.deactivated'
      : status    === 'active'              ? 'client.activated'
      : status    === 'inactive'            ? 'client.deactivated'
      : 'client.updated';
    logAudit(req, auditAction, 'organization', req.params.id, {
      name: rows[0]?.name, fields: [...Object.keys(orgUpdates), ...Object.keys(relUpdates)],
    });
    res.json(rows[0]);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id — remove client from agency (soft-deactivates org)
router.delete('/:id', requirePermission('MANAGE_CLIENTS'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT 1 FROM client_relationships WHERE client_org_id = $1 AND agency_org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });

    await db.transaction(async (conn) => {
      await conn.query(`UPDATE organizations SET is_active = false WHERE id = $1`, [req.params.id]);
      await conn.query(
        `DELETE FROM client_relationships WHERE client_org_id = $1 AND agency_org_id = $2`,
        [req.params.id, req.orgId]
      );
    });

    logAudit(req, 'client.deleted', 'organization', req.params.id, {});
    res.json({ message: 'Client removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
