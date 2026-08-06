INSERT INTO permissions (
    code,
    description
)
VALUES (
    'inventory.financials.read',
    'View vehicle purchase and minimum prices'
)
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
INNER JOIN permissions p
    ON p.code = 'inventory.financials.read'
WHERE r.code IN ('DEALERSHIP_ADMIN', 'SALES_MANAGER')
ON DUPLICATE KEY UPDATE
    permission_id = VALUES(permission_id);
