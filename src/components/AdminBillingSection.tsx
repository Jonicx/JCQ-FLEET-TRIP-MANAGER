import React from 'react';
import { Receipt } from 'lucide-react';
import { EnrichedTrip, Invoice, Payment, PaymentMethod } from '../types/database.ts';
import { formatTsh } from '../utils/currency.ts';
import { AccountingMetric } from './AdminDashboardPrimitives.tsx';
import { DateRange, formatDate, getInvoiceStatus, isWithinRange } from './adminDashboardUtils.ts';

interface AdminBillingSectionProps {
  invoicedAmount: number;
  collectedCash: number;
  outstandingBalance: number;
  reportInvoices: Invoice[];
  reportTripInvoices: Invoice[];
  trips: EnrichedTrip[];
  payments: Payment[];
  reportRange: DateRange;
  completedTripsForInvoice: EnrichedTrip[];
  selectedInvoiceTrip?: EnrichedTrip;
  invoiceAmount: string;
  onInvoiceAmountChange: (value: string) => void;
  onInvoiceTripIdChange: (value: string) => void;
  invoiceNumber: string;
  onInvoiceNumberChange: (value: string) => void;
  invoiceIssuedAt: string;
  onInvoiceIssuedAtChange: (value: string) => void;
  invoiceDueAt: string;
  onInvoiceDueAtChange: (value: string) => void;
  onCreateInvoice: (event: React.FormEvent<HTMLFormElement>) => void;
  availablePaymentInvoices: Invoice[];
  selectedPaymentInvoice?: Invoice;
  onPaymentInvoiceIdChange: (value: string) => void;
  selectedPaymentBalance: number;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  paymentPaidAt: string;
  onPaymentPaidAtChange: (value: string) => void;
  paymentReference: string;
  onPaymentReferenceChange: (value: string) => void;
  onRecordPayment: (event: React.FormEvent<HTMLFormElement>) => void;
  accountingError: string;
  accountingSuccess: string;
}

export const AdminBillingSection: React.FC<AdminBillingSectionProps> = ({
  invoicedAmount,
  collectedCash,
  outstandingBalance,
  reportInvoices,
  reportTripInvoices,
  trips,
  payments,
  reportRange,
  completedTripsForInvoice,
  selectedInvoiceTrip,
  invoiceAmount,
  onInvoiceAmountChange,
  onInvoiceTripIdChange,
  invoiceNumber,
  onInvoiceNumberChange,
  invoiceIssuedAt,
  onInvoiceIssuedAtChange,
  invoiceDueAt,
  onInvoiceDueAtChange,
  onCreateInvoice,
  availablePaymentInvoices,
  selectedPaymentInvoice,
  onPaymentInvoiceIdChange,
  selectedPaymentBalance,
  paymentAmount,
  onPaymentAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentPaidAt,
  onPaymentPaidAtChange,
  paymentReference,
  onPaymentReferenceChange,
  onRecordPayment,
  accountingError,
  accountingSuccess,
}) => (
<section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Invoices and cash receipts</h2>
              <p className="mt-1 text-xs text-slate-500">Issue invoices for completed trips and record partial or full payments.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <AccountingMetric label="Invoices issued" value={formatTsh(invoicedAmount)} />
            <AccountingMetric label="Cash received" value={formatTsh(collectedCash)} />
            <AccountingMetric label="Balance due" value={formatTsh(outstandingBalance)} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Invoice</th>
                  <th className="px-3 py-2.5">Trip</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5 text-right">Received</th>
                  <th className="px-3 py-2.5 text-right">Balance</th>
                  <th className="px-3 py-2.5">Status / due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportInvoices.map((invoice) => {
                  const trip = trips.find((item) => item.id === invoice.trip_id);
                  const paid = payments
                    .filter((payment) => payment.invoice_id === invoice.id)
                    .reduce((sum, payment) => sum + Number(payment.amount), 0);
                  const status = getInvoiceStatus(invoice, payments);
                  return (
                    <tr key={invoice.id}>
                      <td className="px-3 py-2.5">
                        <span className="block font-bold text-slate-800">{invoice.invoice_number}</span>
                        <span className="text-[10px] text-slate-500">Issued {formatDate(invoice.issued_at)}</span>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-700">
                        {trip ? `${trip.origin} → ${trip.destination}` : 'Trip unavailable'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">{formatTsh(invoice.amount)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-emerald-700">{formatTsh(paid)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold">{formatTsh(Math.max(0, invoice.amount - paid))}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          status === 'Paid' ? 'bg-emerald-50 text-emerald-700'
                            : status === 'Overdue' ? 'bg-rose-50 text-rose-700'
                              : status === 'Partially paid' ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                        }`}>{status}</span>
                        <span className="mt-1 block text-[10px] text-slate-500">Due {formatDate(invoice.due_at)}</span>
                      </td>
                    </tr>
                  );
                })}
                {reportInvoices.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No invoices in this report period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Outstanding is the current unpaid balance for invoices issued in the selected period. Collections are payments received within the selected period.
          </p>
          <details className="mt-3 rounded-lg border border-slate-100">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-slate-700">
              Payment transactions ({payments.filter((payment) =>
                reportTripInvoices.some((invoice) => invoice.id === payment.invoice_id) &&
                isWithinRange(payment.paid_at, reportRange),
              ).length})
            </summary>
            <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100 px-3">
              {payments
                .filter((payment) =>
                  reportTripInvoices.some((invoice) => invoice.id === payment.invoice_id) &&
                  isWithinRange(payment.paid_at, reportRange),
                )
                .map((payment) => {
                  const invoice = reportTripInvoices.find((item) => item.id === payment.invoice_id);
                  return (
                    <div key={payment.id} className="flex items-start justify-between gap-3 py-2 text-[11px]">
                      <div className="min-w-0">
                        <span className="block font-semibold text-slate-800">{invoice?.invoice_number || 'Invoice unavailable'} · {payment.method}</span>
                        <span className="text-slate-500">{formatDate(payment.paid_at)}{payment.reference ? ` · Ref ${payment.reference}` : ''}</span>
                      </div>
                      <strong className="shrink-0 text-emerald-700">{formatTsh(payment.amount)}</strong>
                    </div>
                  );
                })}
              {payments.filter((payment) =>
                reportTripInvoices.some((invoice) => invoice.id === payment.invoice_id) &&
                isWithinRange(payment.paid_at, reportRange),
              ).length === 0 && <p className="py-4 text-center text-[11px] text-slate-500">No payments received in this period.</p>}
            </div>
          </details>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form onSubmit={onCreateInvoice} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900">Issue an invoice</h3>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Completed trip
              <select
                value={selectedInvoiceTrip?.id || ''}
                onChange={(event) => {
                  onInvoiceTripIdChange(event.target.value);
                  onInvoiceAmountChange('');
                }}
                required
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
              >
                <option value="" disabled>Select a completed trip</option>
                {completedTripsForInvoice.map((trip) => (
                  <option key={trip.id} value={trip.id}>{trip.origin} → {trip.destination} · {formatTsh(trip.budget_allocated)}</option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Invoice amount (Tsh)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={invoiceAmount}
                onChange={(event) => onInvoiceAmountChange(event.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
              />
            </label>
            {selectedInvoiceTrip && (
              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800">
                  {selectedInvoiceTrip.origin} → {selectedInvoiceTrip.destination}
                </p>
                <p className="mt-1">Trip budget estimate: {formatTsh(selectedInvoiceTrip.budget_allocated)}. Enter the customer price; the estimate is not copied automatically.</p>
                <button
                  type="button"
                  onClick={() => onInvoiceAmountChange(String(selectedInvoiceTrip.budget_allocated))}
                  className="mt-2 font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                >
                  Use budget estimate as invoice amount
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Invoice no. (optional)
                <input
                  value={invoiceNumber}
                  onChange={(event) => onInvoiceNumberChange(event.target.value)}
                  maxLength={80}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Issue date
                <input
                  type="date"
                  value={invoiceIssuedAt}
                  onChange={(event) => onInvoiceIssuedAtChange(event.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Due date
                <input
                  type="date"
                  value={invoiceDueAt}
                  onChange={(event) => onInvoiceDueAtChange(event.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={completedTripsForInvoice.length === 0}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create invoice
            </button>
          </form>

          <div className="border-t border-slate-100 pt-3">
            <form onSubmit={onRecordPayment} className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Record a payment</h3>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unpaid invoice
                <select
                  value={selectedPaymentInvoice?.id || ''}
                  onChange={(event) => onPaymentInvoiceIdChange(event.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                >
                  {availablePaymentInvoices.map((invoice) => {
                    const paid = payments
                      .filter((payment) => payment.invoice_id === invoice.id)
                      .reduce((sum, payment) => sum + payment.amount, 0);
                    return <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · due {formatTsh(invoice.amount - paid)}</option>;
                  })}
                  {availablePaymentInvoices.length === 0 && <option value="">No unpaid invoices</option>}
                </select>
              </label>
              {selectedPaymentInvoice && (
                <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                  {selectedPaymentInvoice.invoice_number} · Invoice {formatTsh(selectedPaymentInvoice.amount)} ·
                  <strong className="text-slate-900"> Remaining balance: {formatTsh(selectedPaymentBalance)}</strong>
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Amount (Tsh)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={selectedPaymentBalance}
                    value={paymentAmount}
                    onChange={(event) => onPaymentAmountChange(event.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Method
                  <select
                    value={paymentMethod}
                    onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                  >
                    <option>Bank transfer</option>
                    <option>Mobile money</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Received date
                  <input
                    type="date"
                    value={paymentPaidAt}
                    onChange={(event) => onPaymentPaidAtChange(event.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Reference (optional)
                  <input
                    value={paymentReference}
                    onChange={(event) => onPaymentReferenceChange(event.target.value)}
                    maxLength={120}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium normal-case tracking-normal text-slate-700"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={availablePaymentInvoices.length === 0}
                className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Record payment
              </button>
            </form>
          </div>
          {accountingError && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700">{accountingError}</p>}
          {accountingSuccess && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-800">{accountingSuccess}</p>}
        </div>
      </section>
);
