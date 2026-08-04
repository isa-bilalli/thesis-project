CREATE TABLE IF NOT EXISTS customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    customer_type VARCHAR(20) NOT NULL,

    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    company_name VARCHAR(150) NULL,

    email VARCHAR(255) NULL,
    phone VARCHAR(30) NOT NULL,
    secondary_phone VARCHAR(30) NULL,

    address_line_1 VARCHAR(200) NULL,
    address_line_2 VARCHAR(200) NULL,
    city VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country_code CHAR(2) NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PROSPECT',
    assigned_to_user_id INT UNSIGNED NULL,
    notes TEXT NULL,

    created_by_user_id INT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    CONSTRAINT fk_customers_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_customers_assigned_to
        FOREIGN KEY (assigned_to_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_customers_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_customers_type
        CHECK (customer_type IN ('INDIVIDUAL', 'BUSINESS')),

    CONSTRAINT chk_customers_status
        CHECK (status IN ('PROSPECT', 'CUSTOMER', 'INACTIVE')),

    CONSTRAINT chk_customers_required_name
        CHECK (
            (
                customer_type = 'INDIVIDUAL'
                AND first_name IS NOT NULL
                AND last_name IS NOT NULL
            )
            OR
            (
                customer_type = 'BUSINESS'
                AND company_name IS NOT NULL
            )
        ),

    INDEX idx_customers_tenant_phone
        (tenant_id, phone),

    INDEX idx_customers_tenant_email
        (tenant_id, email),

    INDEX idx_customers_assigned_to
        (tenant_id, assigned_to_user_id)
);

CREATE TABLE IF NOT EXISTS leads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NOT NULL,
    assigned_to_user_id INT UNSIGNED NULL,

    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',

    budget_min DECIMAL(12,2) NULL,
    budget_max DECIMAL(12,2) NULL,

    last_contact_at DATETIME(3) NULL,
    next_follow_up_at DATETIME(3) NULL,
    converted_at DATETIME(3) NULL,
    lost_reason VARCHAR(255) NULL,
    notes TEXT NULL,

    created_by_user_id INT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    CONSTRAINT fk_leads_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_leads_location
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_leads_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_leads_assigned_to
        FOREIGN KEY (assigned_to_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_leads_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_leads_source
        CHECK (
            source IN (
                'WALK_IN',
                'WEBSITE',
                'PHONE',
                'EMAIL',
                'REFERRAL',
                'SOCIAL_MEDIA',
                'OTHER'
            )
        ),

    CONSTRAINT chk_leads_status
        CHECK (
            status IN (
                'NEW',
                'CONTACTED',
                'QUALIFIED',
                'WON',
                'LOST'
            )
        ),

    CONSTRAINT chk_leads_priority
        CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')),

    CONSTRAINT chk_leads_budget_min
        CHECK (budget_min IS NULL OR budget_min >= 0),

    CONSTRAINT chk_leads_budget_max
        CHECK (budget_max IS NULL OR budget_max >= 0),

    CONSTRAINT chk_leads_budget_order
        CHECK (
            budget_min IS NULL
            OR budget_max IS NULL
            OR budget_min <= budget_max
        ),

    INDEX idx_leads_tenant_status
        (tenant_id, status),

    INDEX idx_leads_assignee_status
        (tenant_id, assigned_to_user_id, status),

    INDEX idx_leads_follow_up
        (tenant_id, next_follow_up_at)
);

CREATE TABLE IF NOT EXISTS lead_vehicles (
    tenant_id INT UNSIGNED NOT NULL,
    lead_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    interest_notes VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (tenant_id, lead_id, vehicle_id),

    CONSTRAINT fk_lead_vehicles_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lead_vehicles_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_lead_vehicles_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

    INDEX idx_lead_vehicles_vehicle
        (tenant_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS lead_activities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    lead_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,

    activity_type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    subject VARCHAR(150) NULL,
    details TEXT NULL,
    outcome VARCHAR(255) NULL,

    scheduled_at DATETIME(3) NULL,
    completed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_lead_activities_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_lead_activities_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_lead_activities_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_lead_activities_type
        CHECK (
            activity_type IN (
                'NOTE',
                'CALL',
                'EMAIL',
                'MEETING',
                'FOLLOW_UP',
                'STATUS_CHANGE'
            )
        ),

    CONSTRAINT chk_lead_activities_status
        CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),

    INDEX idx_lead_activities_lead
        (tenant_id, lead_id, created_at),

    INDEX idx_lead_activities_schedule
        (tenant_id, scheduled_at, status)
);

CREATE TABLE IF NOT EXISTS test_drives (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NOT NULL,
    lead_id INT UNSIGNED NULL,
    customer_id INT UNSIGNED NOT NULL,
    vehicle_id INT UNSIGNED NOT NULL,
    salesperson_user_id INT UNSIGNED NOT NULL,

    scheduled_start DATETIME(3) NOT NULL,
    scheduled_end DATETIME(3) NOT NULL,
    actual_start DATETIME(3) NULL,
    actual_end DATETIME(3) NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT NULL,
    cancellation_reason VARCHAR(255) NULL,

    created_by_user_id INT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT fk_test_drives_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_test_drives_location
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_test_drives_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_test_drives_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_test_drives_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_test_drives_salesperson
        FOREIGN KEY (salesperson_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_test_drives_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_test_drives_status
        CHECK (
            status IN (
                'SCHEDULED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW'
            )
        ),

    CONSTRAINT chk_test_drives_scheduled_times
        CHECK (scheduled_end > scheduled_start),

    CONSTRAINT chk_test_drives_actual_times
        CHECK (
            actual_end IS NULL
            OR actual_start IS NULL
            OR actual_end > actual_start
        ),

    INDEX idx_test_drives_schedule
        (tenant_id, scheduled_start, status),

    INDEX idx_test_drives_vehicle
        (tenant_id, vehicle_id, scheduled_start),

    INDEX idx_test_drives_salesperson
        (tenant_id, salesperson_user_id, scheduled_start)
);