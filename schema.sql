-- ============================================================================
-- JCQ General Supply Company: Truck & Trip Management Database Schema
-- Dialect: PostgreSQL (compatible with versions 13+)
-- ============================================================================

-- Enable UUID extension for robust distributed keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE truck_status_enum AS ENUM ('Available', 'On Trip', 'Maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE driver_status_enum AS ENUM ('Available', 'On Trip', 'Off Duty');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trip_status_enum AS ENUM ('Planned', 'Ongoing', 'Completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_type_enum AS ENUM ('Fuel', 'Tolls', 'Police/Bribes', 'Food', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. TRUCKS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trucks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(32) NOT NULL UNIQUE,
    model VARCHAR(120) NOT NULL,
    status truck_status_enum NOT NULL DEFAULT 'Available',
    year INT CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    capacity_tons NUMERIC(5, 2) CHECK (capacity_tons > 0),
    current_mileage INT DEFAULT 0 CHECK (current_mileage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. DRIVERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    status driver_status_enum NOT NULL DEFAULT 'Available',
    experience_years INT DEFAULT 1 CHECK (experience_years >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. TRIPS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id UUID NOT NULL REFERENCES trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status trip_status_enum NOT NULL DEFAULT 'Planned',
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    budget_allocated NUMERIC(12, 2) NOT NULL CHECK (budget_allocated >= 0),
    driver_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (driver_pay >= 0),
    cargo_type VARCHAR(150),
    notes TEXT,
    -- Denormalized array for quick access to delay summary strings
    delay_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Finalized Financial Outcome (Calculated & saved when status becomes 'Completed')
    final_profit_loss NUMERIC(12, 2),
    total_expenses_cost NUMERIC(10, 2),
    total_spare_parts_cost NUMERIC(10, 2),
    financial_flag VARCHAR(20) CHECK (financial_flag IN ('Profitable', 'Loss')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_scheduled_dates CHECK (scheduled_end >= scheduled_start)
);

-- ----------------------------------------------------------------------------
-- 4b. DYNAMIC DELAY LOGS (Granular timestamps and delay reasons)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_delay_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE CASCADE,
    reason TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    location VARCHAR(255),
    duration_minutes INT DEFAULT 0 CHECK (duration_minutes >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. EXPENSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE CASCADE,
    expense_type expense_type_enum NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. SPARE_PARTS TABLE (Maintenance required during a trip)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    description TEXT,
    replaced_by VARCHAR(150),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. INVOICES & PAYMENTS (Billed revenue and cash collection)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_number VARCHAR(80) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    issued_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invoice_dates CHECK (due_at >= issued_at)
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(30) NOT NULL CHECK (method IN ('Cash', 'Bank transfer', 'Mobile money', 'Cheque', 'Other')),
    paid_at TIMESTAMPTZ NOT NULL,
    reference VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The demo app uses self-reported local operator names. Production deployments
-- should populate actor from an authenticated user identity and restrict writes.
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(120) NOT NULL,
    related_trip_id VARCHAR(120),
    summary TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. PERFORMANCE INDEXES (Optimized query performance for foreign keys & filters)
-- ============================================================================

-- Foreign Key Indexes for Trips
CREATE INDEX IF NOT EXISTS idx_trips_truck_id ON trips(truck_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled_start ON trips(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled_end ON trips(scheduled_end);

-- Foreign Key & Filter Indexes for Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_timestamp ON expenses(timestamp);

-- Foreign Key & Filter Indexes for Spare Parts
CREATE INDEX IF NOT EXISTS idx_spare_parts_trip_id ON spare_parts(trip_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_timestamp ON spare_parts(timestamp);

-- Foreign Key & Timestamp Indexes for Delay Logs
CREATE INDEX IF NOT EXISTS idx_trip_delay_logs_trip_id ON trip_delay_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_delay_logs_timestamp ON trip_delay_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_invoices_trip_id ON invoices(trip_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON invoices(issued_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_at ON invoices(due_at);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_related_trip ON audit_logs(related_trip_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Enforce invoice balance under concurrent payment inserts.
CREATE OR REPLACE FUNCTION validate_invoice_payment_balance()
RETURNS TRIGGER AS $$
DECLARE
    invoice_limit NUMERIC(12, 2);
    paid_so_far NUMERIC(12, 2);
BEGIN
    SELECT amount INTO invoice_limit
    FROM invoices
    WHERE id = NEW.invoice_id
    FOR UPDATE;

    IF invoice_limit IS NULL THEN
        RAISE EXCEPTION 'Invoice % does not exist', NEW.invoice_id;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO paid_so_far
    FROM payments
    WHERE invoice_id = NEW.invoice_id;

    IF paid_so_far + NEW.amount > invoice_limit THEN
        RAISE EXCEPTION 'Payment total exceeds invoice % balance', NEW.invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_invoice_payment_balance ON payments;
CREATE TRIGGER trg_validate_invoice_payment_balance
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION validate_invoice_payment_balance();

CREATE OR REPLACE FUNCTION require_completed_trip_for_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM trips WHERE id = NEW.trip_id AND status = 'Completed') THEN
        RAISE EXCEPTION 'Invoices can only be issued for completed trips';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_require_completed_trip_for_invoice ON invoices;
CREATE TRIGGER trg_require_completed_trip_for_invoice
BEFORE INSERT OR UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION require_completed_trip_for_invoice();

CREATE OR REPLACE FUNCTION prevent_immutable_record_changes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_append_only ON payments;
CREATE TRIGGER trg_payments_append_only
BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();

-- Helper trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_trucks_updated_at ON trucks;
CREATE TRIGGER trg_trucks_updated_at BEFORE UPDATE ON trucks FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_drivers_updated_at ON drivers;
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
