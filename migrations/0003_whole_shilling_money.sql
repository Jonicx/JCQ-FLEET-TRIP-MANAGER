-- ============================================================================
-- Money is stored as WHOLE Tanzanian shillings (Tsh), never as cents.
-- Whole numbers add up exactly in both PostgreSQL and JavaScript, so every
-- total, balance and profit figure tallies to the shilling.
-- Safe to run now: the relational tables are still empty.
-- ============================================================================

ALTER TABLE trips
    ALTER COLUMN budget_allocated       TYPE NUMERIC(16, 0),
    ALTER COLUMN driver_pay             TYPE NUMERIC(16, 0),
    ALTER COLUMN final_profit_loss      TYPE NUMERIC(16, 0),
    ALTER COLUMN total_expenses_cost    TYPE NUMERIC(16, 0),
    ALTER COLUMN total_spare_parts_cost TYPE NUMERIC(16, 0);

ALTER TABLE expenses              ALTER COLUMN amount TYPE NUMERIC(16, 0);
ALTER TABLE spare_parts           ALTER COLUMN price  TYPE NUMERIC(16, 0);
ALTER TABLE truck_service_records ALTER COLUMN price  TYPE NUMERIC(16, 0);
ALTER TABLE invoices              ALTER COLUMN amount TYPE NUMERIC(16, 0);
ALTER TABLE payments              ALTER COLUMN amount TYPE NUMERIC(16, 0);

-- Payment balance check, rewritten for whole-shilling columns.
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

-- Roles are decided by the API from the owner-managed email lists, with no
-- in-app approval step, so new users are usable immediately.
ALTER TABLE app_users ALTER COLUMN is_active SET DEFAULT TRUE;
