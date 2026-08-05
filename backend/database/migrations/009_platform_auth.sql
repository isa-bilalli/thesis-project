ALTER TABLE platform_users
    ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1
        AFTER password_hash;

CREATE TABLE IF NOT EXISTS platform_refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    platform_user_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    replaced_by_token_id INT UNSIGNED NULL,
    revocation_reason VARCHAR(100) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    CONSTRAINT uq_platform_refresh_tokens_hash
        UNIQUE (token_hash),

    CONSTRAINT fk_platform_refresh_tokens_user
        FOREIGN KEY (platform_user_id)
        REFERENCES platform_users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_platform_refresh_tokens_replacement
        FOREIGN KEY (replaced_by_token_id)
        REFERENCES platform_refresh_tokens(id)
        ON DELETE SET NULL,

    INDEX idx_platform_refresh_tokens_user (platform_user_id),
    INDEX idx_platform_refresh_tokens_expiry (expires_at),
    INDEX idx_platform_refresh_tokens_revoked (revoked_at)
);
