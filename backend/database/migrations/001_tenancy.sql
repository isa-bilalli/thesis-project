CREATE TABLE IF NOT EXISTS tenants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(30) NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Belgrade',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    CONSTRAINT uq_tenants_slug UNIQUE (slug),
    CONSTRAINT chk_tenants_status
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE'))
);

CREATE TABLE IF NOT EXISTS locations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL,
    address_line_1 VARCHAR(200) NOT NULL,
    address_line_2 VARCHAR(200) NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NULL,
    country_code CHAR(2) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(255) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    CONSTRAINT uq_locations_tenant_code
        UNIQUE (tenant_id, code),

    CONSTRAINT fk_locations_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_locations_status
        CHECK (status IN ('ACTIVE', 'INACTIVE')),

    INDEX idx_locations_tenant_status (tenant_id, status)
);