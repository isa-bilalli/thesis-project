INSERT INTO permissions (code, description)
VALUES
    ('users.manage', 'Create, update and disable dealership users'),
    ('locations.manage', 'Create and manage dealership locations'),
    ('inventory.read', 'View vehicle inventory'),
    ('inventory.financials.read', 'View vehicle purchase and minimum prices'),
    ('inventory.write', 'Create and update vehicles'),
    ('inventory.reserve', 'Reserve available vehicles'),
    ('crm.read', 'View customers, leads and test drives'),
    ('crm.write', 'Manage customers, leads and test drives'),
    ('sales.read', 'View offers, reservations and sales'),
    ('sales.create_offer', 'Create and manage sales offers'),
    ('sales.complete', 'Complete vehicle sales'),
    ('reports.read', 'View dealership reports')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

INSERT INTO role_permissions (
    tenant_id,
    role_id,
    permission_id
)
SELECT
    r.tenant_id,
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
LEFT JOIN role_permissions rp
    ON rp.tenant_id = r.tenant_id
    AND rp.role_id = r.id
    AND rp.permission_id = p.id
WHERE rp.permission_id IS NULL
    AND (
        r.code = 'DEALERSHIP_ADMIN'
        OR (
            r.code = 'SALES_MANAGER'
            AND p.code IN (
                'inventory.read',
                'inventory.financials.read',
                'inventory.write',
                'inventory.reserve',
                'crm.read',
                'crm.write',
                'sales.read',
                'sales.create_offer',
                'sales.complete',
                'reports.read'
            )
        )
        OR (
            r.code = 'SALESPERSON'
            AND p.code IN (
                'inventory.read',
                'inventory.reserve',
                'crm.read',
                'crm.write',
                'sales.read',
                'sales.create_offer'
            )
        )
    );
