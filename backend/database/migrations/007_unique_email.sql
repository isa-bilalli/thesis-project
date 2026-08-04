ALTER TABLE users
    DROP INDEX uq_users_tenant_email,
    ADD CONSTRAINT uq_users_email UNIQUE (email);