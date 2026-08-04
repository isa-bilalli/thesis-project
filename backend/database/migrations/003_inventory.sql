CREATE TABLE IF NOT EXISTS vehicles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,
    stock_number VARCHAR(50) NOT NULL,
    vin VARCHAR(32) NULL,

    vehicle_condition VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    trim_level VARCHAR(100) NULL,
    model_year SMALLINT UNSIGNED NOT NULL,
    body_type VARCHAR(50) NULL,
    fuel_type VARCHAR(50) NULL,
    transmission VARCHAR(50) NULL,
    drivetrain VARCHAR(50) NULL,
    engine_description VARCHAR(150) NULL,
    mileage_km INT UNSIGNED NOT NULL DEFAULT 0,

    exterior_color VARCHAR(50) NULL,
    interior_color VARCHAR(50) NULL,
    registration_number VARCHAR(30) NULL,
    first_registration_date DATE NULL,

    acquired_at DATETIME(3) NULL,
    purchase_price DECIMAL(12,2) NULL,
    asking_price DECIMAL(12,2) NULL,
    minimum_price DECIMAL(12,2) NULL,

    primary_image_url VARCHAR(500) NULL,
    description TEXT NULL,

    created_by_user_id INT UNSIGNED NOT NULL,
    updated_by_user_id INT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    CONSTRAINT uq_vehicles_tenant_stock
        UNIQUE (tenant_id, stock_number),

    CONSTRAINT uq_vehicles_tenant_vin
        UNIQUE (tenant_id, vin),

    CONSTRAINT fk_vehicles_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicles_location
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicles_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicles_updated_by
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_vehicles_condition
        CHECK (vehicle_condition IN ('NEW', 'USED')),

    CONSTRAINT chk_vehicles_status
        CHECK (
            status IN (
                'DRAFT',
                'AVAILABLE',
                'RESERVED',
                'SOLD',
                'ARCHIVED'
            )
        ),

    CONSTRAINT chk_vehicles_model_year
        CHECK (model_year >= 1886),

    CONSTRAINT chk_vehicles_purchase_price
        CHECK (purchase_price IS NULL OR purchase_price >= 0),

    CONSTRAINT chk_vehicles_asking_price
        CHECK (asking_price IS NULL OR asking_price >= 0),

    CONSTRAINT chk_vehicles_minimum_price
        CHECK (minimum_price IS NULL OR minimum_price >= 0),

    CONSTRAINT chk_vehicles_price_order
        CHECK (
            minimum_price IS NULL
            OR asking_price IS NULL
            OR minimum_price <= asking_price
        ),

    INDEX idx_vehicles_tenant_status
        (tenant_id, status),

    INDEX idx_vehicles_location_status
        (tenant_id, location_id, status),

    INDEX idx_vehicles_make_model
        (tenant_id, make, model),

    INDEX idx_vehicles_model_year
        (tenant_id, model_year)
);