import { EnrichedTrip, Invoice, Payment } from '../types/database.ts';

export type DateRange = { start: number | null; end: number | null };

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const getTripCostBreakdown = (trip: EnrichedTrip, range: DateRange) => {
  const expenses = trip.status === 'Completed'
    ? trip.expenses
    : trip.expenses.filter((expense) => isWithinRange(expense.timestamp, range));
  const spareParts = trip.status === 'Completed'
    ? trip.spare_parts
    : trip.spare_parts.filter((part) => isWithinRange(part.timestamp, range));
  const itemizedExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const itemizedParts = spareParts.reduce((sum, part) => sum + Number(part.price || 0), 0);
  const expensesTotal = trip.status === 'Completed' ? trip.total_expenses : itemizedExpenses;
  const partsTotal = trip.status === 'Completed' ? trip.total_spare_parts : itemizedParts;
  const driverPay = trip.status === 'Completed' ? Number(trip.driver_pay || 0) : 0;
  return {
    expenses,
    spareParts,
    expensesTotal,
    partsTotal,
    driverPay,
    total: expensesTotal + partsTotal + driverPay,
    expenseAdjustment: trip.status === 'Completed' ? expensesTotal - itemizedExpenses : 0,
    partsAdjustment: trip.status === 'Completed' ? partsTotal - itemizedParts : 0,
  };
};

export const isWithinRange = (value: string, range: DateRange) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) &&
    (range.start === null || timestamp >= range.start) &&
    (range.end === null || timestamp <= range.end);
};

export const getInvoiceStatus = (invoice: Invoice, payments: Payment[]) => {
  const paid = payments
    .filter((payment) => payment.invoice_id === invoice.id)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  if (paid >= invoice.amount) return 'Paid';
  if (new Date(invoice.due_at).getTime() < Date.now()) return 'Overdue';
  if (paid > 0) return 'Partially paid';
  return 'Outstanding';
};
