CREATE TABLE IF NOT EXISTS platform_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'SYSTEM_ADMIN',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    last_login_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,

    CONSTRAINT uq_platform_users_email
        UNIQUE (email),

    CONSTRAINT chk_platform_users_role
        CHECK (role IN ('SYSTEM_ADMIN')),

    CONSTRAINT chk_platform_users_status
        CHECK (status IN ('ACTIVE', 'DISABLED'))
);