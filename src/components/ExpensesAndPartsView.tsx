import React, { useState } from 'react';
import {
  Receipt,
  Wrench,
  Search,
  Filter,
  Calendar,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { Expense, SparePart, EnrichedTrip, ExpenseType } from '../types/database.ts';
import { formatTZS } from '../utils/currency.ts';

interface ExpensesAndPartsViewProps {
  expenses: Expense[];
  spareParts: SparePart[];
  trips: EnrichedTrip[];
  onDeleteExpense: (id: string) => void;
  onDeleteSparePart: (id: string) => void;
  onSelectTrip: (tripId: string) => void;
}

export const ExpensesAndPartsView: React.FC<ExpensesAndPartsViewProps> = ({
  expenses,
  spareParts,
  trips,
  onDeleteExpense,
  onDeleteSparePart,
  onSelectTrip,
}) => {
  const [activeLedger, setActiveLedger] = useState<'all' | 'expenses' | 'spares'>('all');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [dateValue, setDateValue] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const cityOptions = Array.from(
    new Set(
      trips.flatMap((trip) => [trip.origin, trip.destination]).filter((city): city is string => Boolean(city))
    )
  ).sort();

  // Total metrics
  const totalExpenseSum = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSparePartsSum = spareParts.reduce((sum, sp) => sum + Number(sp.price), 0);
  const totalCombined = totalExpenseSum + totalSparePartsSum;

  const dateRangeStartValue = dateRangeStart || dateRangeEnd;
  const dateRangeEndValue = dateRangeEnd || dateRangeStart;

  const summaryToneClasses = {
    amber: 'border-amber-200 bg-white text-amber-600',
    blue: 'border-blue-200 bg-white text-blue-600',
    rose: 'border-rose-200 bg-white text-rose-600',
    emerald: 'border-emerald-200 bg-white text-emerald-600',
    purple: 'border-purple-200 bg-white text-purple-600',
    orange: 'border-orange-200 bg-orange-50/30 text-orange-700',
  } as const;

  const activeFilterChips = [
    searchTerm.trim() ? `Search: ${searchTerm.trim()}` : null,
    cityFilter !== 'All' ? `City: ${cityFilter}` : null,
    activeLedger !== 'all' ? `Ledger: ${activeLedger === 'expenses' ? 'Trip Expenses' : 'Spare Parts'}` : null,
    selectedType !== 'All' ? `Type: ${selectedType}` : null,
    dateMode === 'single' && dateValue ? `Date: ${new Date(`${dateValue}T00:00:00`).toLocaleDateString()}` : null,
    dateMode === 'range' && (dateRangeStartValue || dateRangeEndValue)
      ? `Range: ${
          dateRangeStartValue && dateRangeEndValue && dateRangeStartValue > dateRangeEndValue
            ? `${new Date(`${dateRangeEndValue}T00:00:00`).toLocaleDateString()} → ${new Date(`${dateRangeStartValue}T00:00:00`).toLocaleDateString()}`
            : `${dateRangeStartValue ? new Date(`${dateRangeStartValue}T00:00:00`).toLocaleDateString() : '—'} → ${dateRangeEndValue ? new Date(`${dateRangeEndValue}T00:00:00`).toLocaleDateString() : '—'}`
        }`
      : null,
  ].filter(Boolean) as string[];

  const hasActiveFilters = activeFilterChips.length > 0;

  const dateRangeSummary = (() => {
    if (dateMode !== 'range' || (!dateRangeStart && !dateRangeEnd)) return null;

    const safeStart = dateRangeStart && dateRangeEnd && dateRangeStart > dateRangeEnd ? dateRangeEnd : dateRangeStart;
    const safeEnd = dateRangeEnd && dateRangeStart && dateRangeStart > dateRangeEnd ? dateRangeStart : dateRangeEnd;
    if (!safeStart && !safeEnd) return null;

    const startDate = safeStart ? new Date(`${safeStart}T00:00:00`) : null;
    const endDate = safeEnd ? new Date(`${safeEnd}T23:59:59`) : null;

    if (!startDate && endDate) {
      return `Until ${endDate.toLocaleDateString()}`;
    }
    if (startDate && !endDate) {
      return `From ${startDate.toLocaleDateString()}`;
    }
    if (!startDate || !endDate) return null;

    const diffDays = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    return `${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()} (${diffDays + 1} days)`;
  })();

  // Breakdown by Expense Type
  const fuelTotal = expenses
    .filter((e) => e.expense_type === 'Fuel')
    .reduce((s, e) => s + Number(e.amount), 0);
  const tollsTotal = expenses
    .filter((e) => e.expense_type === 'Tolls')
    .reduce((s, e) => s + Number(e.amount), 0);
  const policeBribesTotal = expenses
    .filter((e) => e.expense_type === 'Police/Bribes')
    .reduce((s, e) => s + Number(e.amount), 0);
  const foodTotal = expenses
    .filter((e) => e.expense_type === 'Food')
    .reduce((s, e) => s + Number(e.amount), 0);
  const otherTotal = expenses
    .filter((e) => e.expense_type === 'Other')
    .reduce((s, e) => s + Number(e.amount), 0);

  const summaryCards = [
    {
      key: 'fuel',
      label: 'Fuel (Diesel)',
      value: formatTZS(fuelTotal, { maximumFractionDigits: 0 }),
      subtitle: `${expenses.filter((e) => e.expense_type === 'Fuel').length} fills`,
      tone: 'amber',
    },
    {
      key: 'tolls',
      label: 'Highway Tolls',
      value: formatTZS(tollsTotal, { maximumFractionDigits: 0 }),
      subtitle: `${expenses.filter((e) => e.expense_type === 'Tolls').length} gates`,
      tone: 'blue',
    },
    {
      key: 'police',
      label: 'Police / Bribes',
      value: formatTZS(policeBribesTotal, { maximumFractionDigits: 0 }),
      subtitle: `${expenses.filter((e) => e.expense_type === 'Police/Bribes').length} checks`,
      tone: 'rose',
    },
    {
      key: 'food',
      label: 'Driver Food',
      value: formatTZS(foodTotal, { maximumFractionDigits: 0 }),
      subtitle: `${expenses.filter((e) => e.expense_type === 'Food').length} per-diems`,
      tone: 'emerald',
    },
    {
      key: 'other',
      label: 'Other Fees',
      value: formatTZS(otherTotal, { maximumFractionDigits: 0 }),
      subtitle: 'Parking & yard',
      tone: 'purple',
    },
    {
      key: 'spares',
      label: 'Spare Parts',
      value: formatTZS(totalSparePartsSum, { maximumFractionDigits: 0 }),
      subtitle: `${spareParts.length} maintenance`,
      tone: 'orange',
    },
  ];

  // Combine items for unified ledger
  const unifiedItems = [
    ...expenses.map((e) => ({
      id: e.id,
      kind: 'expense' as const,
      trip_id: e.trip_id,
      category: e.expense_type,
      title: `${e.expense_type} Disbursement`,
      description: e.description,
      amount: Number(e.amount),
      timestamp: e.timestamp,
    })),
    ...spareParts.map((sp) => ({
      id: sp.id,
      kind: 'spare_part' as const,
      trip_id: sp.trip_id,
      category: 'Spare Part',
      title: sp.part_name,
      description: `${sp.description || ''} ${sp.replaced_by ? `(Mechanic: ${sp.replaced_by})` : ''}`,
      amount: Number(sp.price),
      timestamp: sp.timestamp,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredItems = unifiedItems.filter((item) => {
    if (activeLedger === 'expenses' && item.kind !== 'expense') return false;
    if (activeLedger === 'spares' && item.kind !== 'spare_part') return false;
    if (selectedType !== 'All' && item.category !== selectedType) return false;

    const trip = trips.find((t) => t.id === item.trip_id);
    const routeCities = trip ? [trip.origin, trip.destination] : [];
    if (cityFilter !== 'All' && !routeCities.some((city) => city.toLowerCase().includes(cityFilter.toLowerCase()))) {
      return false;
    }

    const itemDate = new Date(item.timestamp);
    const rangeStart =
      dateMode === 'range' && dateRangeStart && dateRangeEnd && dateRangeStart > dateRangeEnd ? dateRangeEnd : dateRangeStart;
    const rangeEnd =
      dateMode === 'range' && dateRangeStart && dateRangeEnd && dateRangeStart > dateRangeEnd ? dateRangeStart : dateRangeEnd;
    const dateStart = dateMode === 'range' ? (rangeStart || rangeEnd || dateValue) : dateValue;
    const dateEnd = dateMode === 'range' ? (rangeEnd || rangeStart || dateValue) : dateValue;

    if (dateStart && itemDate < new Date(`${dateStart}T00:00:00`)) return false;
    if (dateEnd && itemDate > new Date(`${dateEnd}T23:59:59`)) return false;

    const searchLower = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      item.category.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <span>Transit Expenses &amp; Maintenance Ledger</span>
          <span className="text-xs hidden font-semibold px-2 py-0.5 rounded-full sm:flex bg-slate-200 text-slate-700">
            {formatTZS(totalCombined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited breakdown of operational costs: Fuel, Tolls, Police/Bribes checkpoint clearance, Food, and Roadside Spare Parts
        </p>
      </div>

      {/* Spend Breakdown Cards */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card) => {
          const toneClasses = summaryToneClasses[card.tone as keyof typeof summaryToneClasses];

          return (
            <div key={card.key} className={`bg-white p-3.5 rounded-xl border shadow-2xs ${toneClasses}`}>
              <span className="text-[10px] font-bold uppercase block">{card.label}</span>
              <span className="text-lg font-extrabold text-slate-900 font-mono mt-1 block">{card.value}</span>
              <span className="text-[10px] text-slate-400">{card.subtitle}</span>
            </div>
          );
        })}
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsSummaryOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-xs"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expense Summary</div>
            <div className="text-sm font-bold text-slate-800">{formatTZS(totalCombined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
            {isSummaryOpen ? 'Hide' : 'Show'}
          </span>
        </button>

        {isSummaryOpen && (
          <div className="mt-3 grid grid-cols-1 gap-3">
            {summaryCards.map((card) => {
              const toneClasses = summaryToneClasses[card.tone as keyof typeof summaryToneClasses];

              return (
                <div key={`${card.key}-mobile`} className={`bg-white p-3.5 rounded-xl border shadow-2xs ${toneClasses}`}>
                  <span className="text-[10px] font-bold uppercase block">{card.label}</span>
                  <span className="text-lg font-extrabold text-slate-900 font-mono mt-1 block">{card.value}</span>
                  <span className="text-[10px] text-slate-400">{card.subtitle}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Tab Bar */}
      <div
        className={`bg-white p-3 rounded-xl border shadow-xs sm:p-4 ${
          hasActiveFilters ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-200' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr]">
            <div className={`relative rounded-lg border ${searchTerm.trim() ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50'}`}>
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search disbursements, parts, descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
              cityFilter !== 'All' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="All">All cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${
            dateMode === 'range' && (dateRangeStart || dateRangeEnd)
              ? 'border-amber-300 bg-amber-50/60'
              : dateValue
              ? 'border-amber-300 bg-amber-50/60'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Date filter</span>
              </div>

              <div className="inline-flex rounded-full bg-slate-200 p-0.5">
                {(['single', 'range'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateMode(mode)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                      dateMode === mode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {mode === 'single' ? 'Day' : 'Range'}
                  </button>
                ))}
              </div>
            </div>

            {dateMode === 'single' ? (
              <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-700 focus:outline-none"
                />
              </label>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-700 focus:outline-none"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-700 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {dateRangeSummary && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-100 to-white px-2.5 py-2 text-[10px] font-bold text-amber-800">
                Range selected: {dateRangeSummary}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['all', 'expenses', 'spares'] as const).map((ledger) => (
                <button
                  key={ledger}
                  onClick={() => {
                    setActiveLedger(ledger);
                    setSelectedType('All');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                    activeLedger === ledger
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ledger === 'all' ? 'All Disbursements' : ledger === 'expenses' ? 'Trip Expenses' : 'Spare Parts'}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeFilterChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Item / Description</th>
                <th className="py-3.5 px-4">Trip Route Ref</th>
                <th className="py-3.5 px-4">Disbursed Amount</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const linkedTrip = trips.find((t) => t.id === item.trip_id);

                return (
                  <tr key={`${item.kind}-${item.id}`} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                          item.category === 'Fuel'
                            ? 'bg-amber-100 text-amber-800'
                            : item.category === 'Tolls'
                            ? 'bg-blue-100 text-blue-800'
                            : item.category === 'Police/Bribes'
                            ? 'bg-rose-100 text-rose-800'
                            : item.category === 'Food'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.category === 'Spare Part'
                            ? 'bg-orange-100 text-orange-900 border border-orange-200'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-sm">
                        {item.description || '-'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {linkedTrip ? (
                        <button
                          onClick={() => onSelectTrip(linkedTrip.id)}
                          className="text-blue-600 hover:underline flex items-center space-x-1 font-semibold text-left"
                        >
                          <span className="truncate max-w-[160px]">
                            {linkedTrip.origin.split(',')[0]} → {linkedTrip.destination.split(',')[0]}
                          </span>
                          <ArrowUpRight className="h-3 w-3 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">{item.trip_id.slice(0, 8)}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {formatTZS(item.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (item.kind === 'expense') {
                            onDeleteExpense(item.id);
                          } else {
                            onDeleteSparePart(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
