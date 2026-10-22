-- Team-wide shared data: sync version, account approval, invoice voids, payment reversals,
-- and a transaction-scoped bypass so admins can run sanctioned destructive operations.

CREATE TABLE IF NOT EXISTS app_meta (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    data_version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO app_meta (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- New sign-ups wait for an admin to approve them.
ALTER TABLE app_users ALTER COLUMN is_active SET DEFAULT FALSE;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoice_void_reason') THEN
        ALTER TABLE invoices ADD CONSTRAINT chk_invoice_void_reason
            CHECK (voided_at IS NULL OR length(btrim(void_reason)) > 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_reversals (
    payment_id UUID PRIMARY KEY REFERENCES payments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    reversed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES app_users(user_id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION app_locks_bypassed() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(current_setting('app.bypass_locks', TRUE), '') = 'on';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION prevent_immutable_record_changes() RETURNS TRIGGER AS $$
BEGIN
    IF app_locks_bypassed() THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lock_completed_trip() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Completed' AND NOT app_locks_bypassed() THEN
        RAISE EXCEPTION 'Trip % is completed and locked', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lock_completed_trip_children() RETURNS TRIGGER AS $$
DECLARE
    target_trip UUID;
BEGIN
    IF app_locks_bypassed() THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    target_trip := CASE WHEN TG_OP = 'DELETE' THEN OLD.trip_id ELSE NEW.trip_id END;
    IF EXISTS (SELECT 1 FROM trips WHERE id = target_trip AND status = 'Completed') THEN
        RAISE EXCEPTION 'Trip % is completed; % records are locked', target_trip, TG_TABLE_NAME;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_invoice_payment_balance() RETURNS TRIGGER AS $$
DECLARE
    invoice_limit NUMERIC(16, 0);
    invoice_voided TIMESTAMPTZ;
    paid_so_far   NUMERIC(16, 0);
BEGIN
    SELECT amount, voided_at INTO invoice_limit, invoice_voided FROM invoices WHERE id = NEW.invoice_id FOR UPDATE;
    IF invoice_limit IS NULL THEN
        RAISE EXCEPTION 'Invoice % does not exist', NEW.invoice_id;
    END IF;
    IF invoice_voided IS NOT NULL THEN
        RAISE EXCEPTION 'Invoice % is void', NEW.invoice_id;
    END IF;
    SELECT COALESCE(SUM(p.amount), 0) INTO paid_so_far
    FROM payments p
    WHERE p.invoice_id = NEW.invoice_id
      AND NOT EXISTS (SELECT 1 FROM payment_reversals r WHERE r.payment_id = p.id);
    IF paid_so_far + NEW.amount > invoice_limit THEN
        RAISE EXCEPTION 'Payment total exceeds the balance of invoice %', NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_void_with_active_payments() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL AND EXISTS (
        SELECT 1 FROM payments p
        WHERE p.invoice_id = NEW.id
          AND NOT EXISTS (SELECT 1 FROM payment_reversals r WHERE r.payment_id = p.id)
    ) THEN
        RAISE EXCEPTION 'Invoice % still has active payments', NEW.id;
    END IF;
    IF OLD.voided_at IS NOT NULL AND NOT app_locks_bypassed() THEN
        RAISE EXCEPTION 'Invoice % is void and locked', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_void_rules ON invoices;
CREATE TRIGGER trg_invoice_void_rules BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION prevent_void_with_active_payments();

DROP TRIGGER IF EXISTS trg_payment_reversals_append_only ON payment_reversals;
CREATE TRIGGER trg_payment_reversals_append_only BEFORE DELETE OR UPDATE ON payment_reversals
    FOR EACH ROW EXECUTE FUNCTION prevent_immutable_record_changes();

-- Link the bootstrap admin row to the real Neon Auth user id when it was created with a placeholder id.
DO $$
BEGIN
    IF to_regclass('neon_auth."user"') IS NOT NULL THEN
        UPDATE app_users AS u
        SET user_id = a.id::text
        FROM neon_auth."user" AS a
        WHERE lower(a.email) = lower(u.email)
          AND u.user_id <> a.id::text
          AND NOT EXISTS (SELECT 1 FROM app_users x WHERE x.user_id = a.id::text);
    END IF;
END $$;

DROP TABLE IF EXISTS app_user_state;
