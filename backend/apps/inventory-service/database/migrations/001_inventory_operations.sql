ALTER TABLE vehicle_reservations
    ADD COLUMN operation_id VARCHAR(128) NULL AFTER reservation_number,
    ADD COLUMN cancellation_operation_id VARCHAR(128) NULL AFTER operation_id,
    ADD CONSTRAINT uq_reservations_tenant_operation
        UNIQUE (tenant_id, operation_id),
    ADD CONSTRAINT uq_reservations_tenant_cancellation_operation
        UNIQUE (tenant_id, cancellation_operation_id);

CREATE TABLE IF NOT EXISTS inventory_operations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT UNSIGNED NOT NULL,
    operation_id VARCHAR(128) NOT NULL,
    operation_type VARCHAR(40) NOT NULL,
    resource_id INT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL,
    response_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at DATETIME(3) NULL,

    CONSTRAINT uq_inventory_operation
        UNIQUE (tenant_id, operation_type, operation_id),
    CONSTRAINT chk_inventory_operation_status
        CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
    INDEX idx_inventory_operations_resource
        (tenant_id, operation_type, resource_id)
);
