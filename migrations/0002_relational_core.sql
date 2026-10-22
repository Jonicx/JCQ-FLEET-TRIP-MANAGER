-- Shared relational schema for team-wide fleet data (reconstructed from the deployed Neon database).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role_enum') THEN CREATE TYPE app_role_enum AS ENUM ('Admin', 'Dispatcher'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'truck_status_enum') THEN CREATE TYPE truck_status_enum AS ENUM ('Available', 'On Trip', 'Maintenance'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status_enum') THEN CREATE TYPE driver_status_enum AS ENUM ('Available', 'On Trip', 'Off Duty'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status_enum') THEN CREATE TYPE trip_status_enum AS ENUM ('Planned', 'Ongoing', 'Completed'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_type_enum') THEN CREATE TYPE expense_type_enum AS ENUM ('Fuel', 'Tolls', 'Police/Bribes', 'Food', 'Other'); END IF;
END $$;

CREATE TABLE IF NOT EXISTS app_users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role app_role_enum NOT NULL DEFAULT 'Dispatcher',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_email ON app_users (lower(email));

CREATE TABLE IF NOT EXISTS trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_plate VARCHAR(20) NOT NULL,
    model VARCHAR(120) NOT NULL,
    status truck_status_enum NOT NULL DEFAULT 'Available',
    year INTEGER CHECK (year >= 1950 AND year <= 2100),
    capacity_tons NUMERIC(6, 2) CHECK (capacity_tons > 0),
    current_mileage INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trucks_plate ON trucks (upper(btrim(license_plate)));

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    license_number VARCHAR(40) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    status driver_status_enum NOT NULL DEFAULT 'Available',
    experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_drivers_license ON drivers (upper(btrim(license_number)));

CREATE TABLE IF NOT EXISTS truck_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('Service', 'Spare Part')),
    item_name VARCHAR(200) NOT NULL,
    price NUMERIC(16, 0) NOT NULL CHECK (price >= 0),
    mechanic_name VARCHAR(120) NOT NULL,
    service_location VARCHAR(200) NOT NULL,
    serviced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_records_truck ON truck_service_records (truck_id);

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID NOT NULL REFERENCES trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status trip_status_enum NOT NULL DEFAULT 'Planned',
    origin VARCHAR(200) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    budget_allocated NUMERIC(16, 0) NOT NULL CHECK (budget_allocated >= 0),
    driver_pay NUMERIC(16, 0) NOT NULL DEFAULT 0 CHECK (driver_pay >= 0),
    cargo_type VARCHAR(120),
    notes TEXT,
    final_profit_loss NUMERIC(16, 0),
    total_expenses_cost NUMERIC(16, 0),
    total_spare_parts_cost NUMERIC(16, 0),
    financial_flag VARCHAR(20) CHECK (financial_flag IN ('Profitable', 'Loss')),
    completed_at TIMESTAMPTZ,
    created_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_trip_dates CHECK (scheduled_end >= scheduled_start)
);
CREATE INDEX IF NOT EXISTS idx_trips_truck_id ON trips (truck_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled_start ON trips (scheduled_start);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trips_one_ongoing_per_truck ON trips (truck_id) WHERE status = 'Ongoing';
CREATE UNIQUE INDEX IF NOT EXISTS uq_trips_one_ongoing_per_driver ON trips (driver_id) WHERE status = 'Ongoing';

CREATE TABLE IF NOT EXISTS trip_delay_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE CASCADE,
    reason TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    location VARCHAR(200),
    duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_delay_logs_trip_id ON trip_delay_logs (trip_id);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE CASCADE,
    expense_type expense_type_enum NOT NULL,
    amount NUMERIC(16, 0) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL DEFAULT '',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses (trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses (expense_type);

CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE CASCADE,
    part_name VARCHAR(200) NOT NULL,
    price NUMERIC(16, 0) NOT NULL CHECK (price >= 0),
    description TEXT NOT NULL DEFAULT '',
    replaced_by VARCHAR(200),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_spare_parts_trip_id ON spare_parts (trip_id);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    invoice_number VARCHAR(80) NOT NULL,
    amount NUMERIC(16, 0) NOT NULL CHECK (amount > 0),
    issued_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invoice_dates CHECK (due_at >= issued_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_number ON invoices (lower(invoice_number));
CREATE INDEX IF NOT EXISTS idx_invoices_trip_id ON invoices (trip_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_at ON invoices (due_at);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    amount NUMERIC(16, 0) NOT NULL CHECK (amount > 0),
    method VARCHAR(30) NOT NULL CHECK (method IN ('Cash', 'Bank transfer', 'Mobile money', 'Cheque', 'Other')),
    paid_at TIMESTAMPTZ NOT NULL,
    reference VARCHAR(120),
    notes TEXT,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments (paid_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id TEXT,
    actor_name VARCHAR(200) NOT NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(120) NOT NULL,
    related_trip_id UUID,
    summary TEXT NOT NULL,
    details JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_related_trip ON audit_logs (related_trip_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_logs (occurred_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lock_completed_trip() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Completed' THEN
        RAISE EXCEPTION 'Trip % is completed and locked', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lock_completed_trip_children() RETURNS TRIGGER AS $$
DECLARE
    target_trip UUID;
BEGIN
    target_trip := CASE WHEN TG_OP = 'DELETE' THEN OLD.trip_id ELSE NEW.trip_id END;
    IF EXISTS (SELECT 1 FROM trips WHERE id = target_trip AND status = 'Completed') THEN
        RAISE EXCEPTION 'Trip % is completed; % records are locked', target_trip, TG_TABLE_NAME;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION require_completed_trip_for_invoice() RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM trips WHERE id = NEW.trip_id AND status = 'Completed') THEN
        RAISE EXCEPTION 'Invoices can only be issued for completed trips';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_immutable_record_changes() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_invoice_payment_balance() RETURNS TRIGGER AS $$
DECLARE
    invoice_limit NUMERIC(16, 0);
    paid_so_far   NUMERIC(16, 0);
BEGIN
    SELECT amount INTO invoice_limit FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;
    IF invoice_limit IS NULL THEN
        RAISE EXCEPTION 'Invoice % does not exist', NEW.invoice_id;
    END IF;
    SELECT COALESCE(SUM(amount), 0) INTO paid_so_far FROM payments WHERE invoice_id = NEW.invoice_id;
    IF paid_so_far + NEW.amount > invoice_limit THEN
        RAISE EXCEPTION 'Payment total exceeds the balance of invoice %', NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_trucks_updated_at ON trucks;
CREATE TRIGGER trg_trucks_updated_at BEFORE UPDATE ON trucks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_drivers_updated_at ON drivers;
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_trips_lock_completed ON trips;
CREATE TRIGGER trg_trips_lock_completed BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION lock_completed_trip();
DROP TRIGGER IF EXISTS trg_expenses_lock ON expenses;
CREATE TRIGGER trg_expenses_lock BEFORE INSERT OR DELETE OR UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION lock_completed_trip_children();
DROP TRIGGER IF EXISTS trg_spare_parts_lock ON spare_parts;
CREATE TRIGGER trg_spare_parts_lock BEFORE INSERT OR DELETE OR UPDATE ON spare_parts FOR EACH ROW EXECUTE FUNCTION lock_completed_trip_children();
DROP TRIGGER IF EXISTS trg_delay_logs_lock ON trip_delay_logs;
CREATE TRIGGER trg_delay_logs_lock BEFORE INSERT OR DELETE OR UPDATE ON trip_delay_logs FOR EACH ROW EXECUTE FUNCTION lock_completed_trip_children();
DROP TRIGGER IF EXISTS trg_invoice_requires_completed_trip ON invoices;
CREATE TRIGGER trg_invoice_requires_completed_trip BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION require_completed_trip_for_invoice();
DROP TRIGGER IF EXISTS trg_payment_balance ON payments;
CREATE TRIGGER trg_payment_balance BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION validate_invoice_payment_balance();
DROP TRIGGER IF EXISTS trg_payments_append_only ON payments;
CREATE TRIGGER trg_payments_append_only BEFORE DELETE OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();
DROP TRIGGER IF EXISTS trg_audit_append_only ON audit_logs;
CREATE TRIGGER trg_audit_append_only BEFORE DELETE OR UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();
