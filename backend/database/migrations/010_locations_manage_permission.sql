INSERT INTO permissions (
    code,
    description
)
VALUES (
    'locations.manage',
    'Create and manage dealership locations'
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
    ON p.code = 'locations.manage'
WHERE r.code = 'DEALERSHIP_ADMIN'
ON DUPLICATE KEY UPDATE
    permission_id = VALUES(permission_id);
