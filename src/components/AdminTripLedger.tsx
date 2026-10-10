import React from 'react';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import { EnrichedTrip, Invoice, Payment } from '../types/database.ts';
import { formatTsh } from '../utils/currency.ts';
import { DetailAmount } from './AdminDashboardPrimitives.tsx';
import { DateRange, formatDate, getTripCostBreakdown } from './adminDashboardUtils.ts';

interface AdminTripLedgerProps {
  filteredTrips: EnrichedTrip[];
  reportTrips: EnrichedTrip[];
  reportRange: DateRange;
  search: string;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  invoices: Invoice[];
  payments: Payment[];
  expandedTripId: string | null;
  onExpandedTripIdChange: (tripId: string | null) => void;
  onSelectTrip: (tripId: string) => void;
}

export const AdminTripLedger: React.FC<AdminTripLedgerProps> = ({
  filteredTrips,
  reportTrips,
  reportRange,
  search,
  onSearchChange,
  onExport,
  invoices,
  payments,
  expandedTripId,
  onExpandedTripIdChange,
  onSelectTrip,
}) => (
<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Trip ledger</h2>
            <p className="mt-1 text-xs text-slate-500">Search, review, and export trip-level financial records.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search routes, drivers, trucks..."
                aria-label="Search trip ledger"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Route</th>
                <th className="px-4 py-3 font-bold">Driver / truck</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Budget estimate</th>
                <th className="px-4 py-3 text-right font-bold">Trip costs</th>
                <th className="px-4 py-3 text-right font-bold">Budget variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map((trip) => {
                const breakdown = getTripCostBreakdown(trip, reportRange);
                const tripInvoices = invoices.filter((invoice) => invoice.trip_id === trip.id);
                const tripInvoiced = tripInvoices.reduce((total, invoice) => total + invoice.amount, 0);
                const tripCollected = payments
                  .filter((payment) => tripInvoices.some((invoice) => invoice.id === payment.invoice_id))
                  .reduce((total, payment) => total + payment.amount, 0);
                const isExpanded = expandedTripId === trip.id;
                return (
                  <React.Fragment key={trip.id}>
                    <tr
                      tabIndex={0}
                      onClick={() => onSelectTrip(trip.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectTrip(trip.id);
                        }
                      }}
                      className="cursor-pointer text-slate-700 transition hover:bg-slate-50 focus:bg-amber-50 focus:outline-none"
                    >
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(trip.completed_at || trip.scheduled_start)}</td>
                      <td className="max-w-[240px] px-4 py-3">
                        <span className="block truncate font-semibold text-slate-900">{trip.origin} → {trip.destination}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{trip.cargo_type || 'General cargo'}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onExpandedTripIdChange(isExpanded ? null : trip.id);
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {isExpanded ? 'Hide cost detail' : 'Show cost detail'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-slate-800">{trip.driver?.full_name || 'Unassigned'}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{trip.truck?.license_plate || 'Unassigned'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                          trip.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : trip.status === 'Ongoing'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatTsh(trip.budget_allocated)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">{formatTsh(breakdown.total)}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                        trip.status !== 'Completed'
                          ? 'text-slate-400'
                          : trip.profit_loss < 0
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                      }`}>
                        {trip.status === 'Completed' ? formatTsh(trip.profit_loss) : 'Not finalized'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800">Trip expenses · {formatTsh(breakdown.expensesTotal)}</h3>
                              {breakdown.expenses.map((expense) => (
                                <div key={expense.id} className="flex justify-between gap-2 text-[11px] text-slate-600">
                                  <span>{expense.expense_type} · {expense.description || 'No description'} <span className="text-slate-400">({formatDate(expense.timestamp)})</span></span>
                                  <strong className="shrink-0 text-slate-800">{formatTsh(expense.amount)}</strong>
                                </div>
                              ))}
                              {breakdown.expenses.length === 0 && <p className="text-[11px] text-slate-500">No itemized expenses in this period.</p>}
                              {Math.abs(breakdown.expenseAdjustment) > 0.01 && <p className="text-[11px] font-semibold text-amber-800">Finalized snapshot adjustment: {formatTsh(breakdown.expenseAdjustment)}</p>}
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800">In-trip parts · {formatTsh(breakdown.partsTotal)}</h3>
                              {breakdown.spareParts.map((part) => (
                                <div key={part.id} className="flex justify-between gap-2 text-[11px] text-slate-600">
                                  <span>{part.part_name} · {part.description || 'No description'} <span className="text-slate-400">({formatDate(part.timestamp)})</span></span>
                                  <strong className="shrink-0 text-slate-800">{formatTsh(part.price)}</strong>
                                </div>
                              ))}
                              {breakdown.spareParts.length === 0 && <p className="text-[11px] text-slate-500">No itemized parts in this period.</p>}
                              {Math.abs(breakdown.partsAdjustment) > 0.01 && <p className="text-[11px] font-semibold text-amber-800">Finalized snapshot adjustment: {formatTsh(breakdown.partsAdjustment)}</p>}
                              <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-700">Driver pay {trip.status === 'Completed' ? '' : '(not yet incurred)'}: <strong>{formatTsh(trip.status === 'Completed' ? trip.driver_pay : 0)}</strong></div>
                              {trip.status !== 'Completed' && <p className="text-[10px] text-slate-500">Planned driver pay estimate: {formatTsh(trip.driver_pay)} (excluded from recorded costs until completion)</p>}
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800">Trip financial reconciliation</h3>
                              <DetailAmount label="Completed trip budget estimate" amount={trip.budget_allocated} />
                              <DetailAmount label="Recorded trip costs" amount={breakdown.total} />
                              {trip.status === 'Completed' ? (
                                <>
                                  <DetailAmount label="Finalized trip budget variance" amount={trip.profit_loss} emphasize />
                                  <p className="text-[10px] leading-relaxed text-slate-500">Budget estimate − expenses − in-trip parts − driver pay. This is not billed revenue or cash collected.</p>
                                </>
                              ) : (
                                <p className="text-[10px] leading-relaxed text-slate-500">Final budget variance is available after this trip is completed.</p>
                              )}
                              <div className="border-t border-slate-200 pt-2">
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer billing · {tripInvoices.length} invoice{tripInvoices.length === 1 ? '' : 's'}</p>
                                <DetailAmount label="Invoiced" amount={tripInvoiced} />
                                <DetailAmount label="Cash received" amount={tripCollected} />
                                <DetailAmount label="Outstanding" amount={Math.max(0, tripInvoiced - tripCollected)} emphasize />
                                {tripInvoices.map((invoice) => (
                                  <p key={invoice.id} className="mt-1 text-[10px] text-slate-500">
                                    {invoice.invoice_number} · {formatTsh(invoice.amount)} · due {formatDate(invoice.due_at)}
                                  </p>
                                ))}
                                {tripInvoices.length === 0 && <p className="mt-1 text-[10px] text-slate-500">No invoice issued.</p>}
                              </div>
                              <button
                                type="button"
                                onClick={() => onSelectTrip(trip.id)}
                                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-white"
                              >
                                Open full trip record
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No trips match this search, period, and status filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
          Showing {filteredTrips.length} of {reportTrips.length} trips matching this report · select a row to view the complete trip record.
        </div>
      </section>
);
