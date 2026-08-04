CREATE TABLE IF NOT EXISTS offers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,
    offer_number VARCHAR(50) NOT NULL,

    lead_id INT UNSIGNED NULL,
    customer_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NOT NULL,
    salesperson_user_id INT UNSIGNED NOT NULL,

    vehicle_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(12,2)
        GENERATED ALWAYS AS (
            vehicle_price
            - discount_amount
            + tax_amount
            + fee_amount
        ) STORED,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    valid_until DATETIME(3) NULL,
    sent_at DATETIME(3) NULL,
    responded_at DATETIME(3) NULL,
    notes TEXT NULL,

    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT uq_offers_tenant_number
        UNIQUE (tenant_id, offer_number),

    CONSTRAINT fk_offers_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_offers_location
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_offers_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_offers_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_offers_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_offers_salesperson
        FOREIGN KEY (salesperson_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_offers_status
        CHECK (
            status IN (
                'DRAFT',
                'SENT',
                'ACCEPTED',
                'REJECTED',
                'EXPIRED',
                'CANCELLED'
            )
        ),

    CONSTRAINT chk_offers_vehicle_price
        CHECK (vehicle_price >= 0),

    CONSTRAINT chk_offers_discount
        CHECK (
            discount_amount >= 0
            AND discount_amount <= vehicle_price
        ),

    CONSTRAINT chk_offers_tax
        CHECK (tax_amount >= 0),

    CONSTRAINT chk_offers_fee
        CHECK (fee_amount >= 0),

    INDEX idx_offers_tenant_status
        (tenant_id, status),

    INDEX idx_offers_customer
        (tenant_id, customer_id),

    INDEX idx_offers_vehicle
        (tenant_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS vehicle_reservations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    reservation_number VARCHAR(50) NOT NULL,

    vehicle_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NOT NULL,
    lead_id INT UNSIGNED NULL,
    offer_id INT UNSIGNED NULL,
    salesperson_user_id INT UNSIGNED NOT NULL,

    agreed_price DECIMAL(12,2) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    reserved_at DATETIME(3) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    cancelled_at DATETIME(3) NULL,
    cancellation_reason VARCHAR(255) NULL,
    notes TEXT NULL,

    created_by_user_id INT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT uq_reservations_tenant_number
        UNIQUE (tenant_id, reservation_number),

    CONSTRAINT fk_reservations_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reservations_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reservations_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reservations_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reservations_offer
        FOREIGN KEY (offer_id)
        REFERENCES offers(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reservations_salesperson
        FOREIGN KEY (salesperson_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_reservations_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_reservations_status
        CHECK (
            status IN (
                'ACTIVE',
                'EXPIRED',
                'CANCELLED',
                'CONVERTED'
            )
        ),

    CONSTRAINT chk_reservations_price
        CHECK (agreed_price IS NULL OR agreed_price >= 0),

    CONSTRAINT chk_reservations_dates
        CHECK (expires_at > reserved_at),

    INDEX idx_reservations_vehicle_status
        (tenant_id, vehicle_id, status),

    INDEX idx_reservations_expiry
        (tenant_id, expires_at, status),

    INDEX idx_reservations_customer
        (tenant_id, customer_id)
);

CREATE TABLE IF NOT EXISTS sales (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,
    sale_number VARCHAR(50) NOT NULL,

    customer_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NOT NULL,
    salesperson_user_id INT UNSIGNED NOT NULL,
    lead_id INT UNSIGNED NULL,
    offer_id INT UNSIGNED NULL,
    reservation_id INT UNSIGNED NULL,

    sale_date DATETIME(3) NOT NULL,
    vehicle_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(12,2)
        GENERATED ALWAYS AS (
            vehicle_price
            - discount_amount
            + tax_amount
            + fee_amount
        ) STORED,

    vehicle_cost_snapshot DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    completed_at DATETIME(3) NULL,
    cancelled_at DATETIME(3) NULL,
    cancellation_reason VARCHAR(255) NULL,
    notes TEXT NULL,

    created_by_user_id INT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT uq_sales_tenant_number
        UNIQUE (tenant_id, sale_number),

    CONSTRAINT fk_sales_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_location
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_salesperson
        FOREIGN KEY (salesperson_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_sales_offer
        FOREIGN KEY (offer_id)
        REFERENCES offers(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_sales_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES vehicle_reservations(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_sales_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_sales_status
        CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),

    CONSTRAINT chk_sales_payment_method
        CHECK (
            payment_method IS NULL
            OR payment_method IN (
                'CASH',
                'BANK_TRANSFER',
                'EXTERNAL_FINANCING',
                'OTHER'
            )
        ),

    CONSTRAINT chk_sales_vehicle_price
        CHECK (vehicle_price >= 0),

    CONSTRAINT chk_sales_discount
        CHECK (
            discount_amount >= 0
            AND discount_amount <= vehicle_price
        ),

    CONSTRAINT chk_sales_tax
        CHECK (tax_amount >= 0),

    CONSTRAINT chk_sales_fee
        CHECK (fee_amount >= 0),

    CONSTRAINT chk_sales_vehicle_cost
        CHECK (vehicle_cost_snapshot >= 0),

    CONSTRAINT chk_sales_completed_at
        CHECK (
            status <> 'COMPLETED'
            OR completed_at IS NOT NULL
        ),

    CONSTRAINT chk_sales_cancelled_at
        CHECK (
            status <> 'CANCELLED'
            OR cancelled_at IS NOT NULL
        ),

    INDEX idx_sales_date_status
        (tenant_id, sale_date, status),

    INDEX idx_sales_salesperson_date
        (tenant_id, salesperson_user_id, sale_date),

    INDEX idx_sales_vehicle
        (tenant_id, vehicle_id),

    INDEX idx_sales_customer
        (tenant_id, customer_id)
);