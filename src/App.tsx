import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { TripsView } from './components/TripsView.tsx';
import { TrucksView } from './components/TrucksView.tsx';
import { DriversView } from './components/DriversView.tsx';
import { ExpensesAndPartsView } from './components/ExpensesAndPartsView.tsx';
import { SchemaStudioView } from './components/SchemaStudioView.tsx';
import { TripDetailModal } from './components/TripDetailModal.tsx';
import { NewTripModal } from './components/NewTripModal.tsx';
import { UpdateTripModal } from './components/UpdateTripModal.tsx';
import { dbStore } from './db/store.ts';
import {
  Truck,
  Driver,
  Trip,
  Expense,
  SparePart,
  EnrichedTrip,
  DatabaseStats,
  TruckStatus,
  DriverStatus,
  TripStatus,
  ExpenseType,
} from './types/database.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState(false);

  // Reactive DB store state
  const [trucks, setTrucks] = useState<Truck[]>(() => dbStore.getTrucks());
  const [drivers, setDrivers] = useState<Driver[]>(() => dbStore.getDrivers());
  const [trips, setTrips] = useState<Trip[]>(() => dbStore.getTrips());
  const [enrichedTrips, setEnrichedTrips] = useState<EnrichedTrip[]>(() => dbStore.getEnrichedTrips());
  const [expenses, setExpenses] = useState<Expense[]>(() => dbStore.getExpenses());
  const [spareParts, setSpareParts] = useState<SparePart[]>(() => dbStore.getSpareParts());
  const [stats, setStats] = useState<DatabaseStats>(() => dbStore.getStats());

  useEffect(() => {
    const syncDb = () => {
      setTrucks(dbStore.getTrucks());
      setDrivers(dbStore.getDrivers());
      setTrips(dbStore.getTrips());
      setEnrichedTrips(dbStore.getEnrichedTrips());
      setExpenses(dbStore.getExpenses());
      setSpareParts(dbStore.getSpareParts());
      setStats(dbStore.getStats());
    };

    const unsubscribe = dbStore.subscribe(syncDb);
    return () => {
      unsubscribe();
    };
  }, []);

  const selectedTrip = selectedTripId ? dbStore.getEnrichedTrip(selectedTripId) : null;
  const updatingTrip = updatingTripId ? dbStore.getEnrichedTrip(updatingTripId) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onResetDb={() => setShowResetConfirm(true)}
        onOpenNewTripModal={() => setShowNewTripModal(true)}
      />

      {/* Reset Success Toast */}
      {resetSuccessToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center shadow-sm">
          Database restored to default JCQ supply seed records successfully.
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            enrichedTrips={enrichedTrips}
            onSelectTrip={(id) => setSelectedTripId(id)}
            onOpenUpdateModal={(id) => setUpdatingTripId(id)}
            onOpenNewTrip={() => setShowNewTripModal(true)}
            onNavigateToSchema={() => setActiveTab('schema')}
          />
        )}

        {activeTab === 'trips' && (
          <TripsView
            trips={enrichedTrips}
            onSelectTrip={(id) => setSelectedTripId(id)}
            onOpenUpdateModal={(id) => setUpdatingTripId(id)}
            onOpenNewTripModal={() => setShowNewTripModal(true)}
            onUpdateTripStatus={(id, status) => dbStore.updateTrip(id, { status })}
            onDeleteTrip={(id) => dbStore.deleteTrip(id)}
          />
        )}

        {activeTab === 'trucks' && (
          <TrucksView
            trucks={trucks}
            onCreateTruck={(data) => dbStore.createTruck(data)}
            onUpdateTruckStatus={(id, status) => dbStore.updateTruck(id, { status })}
            onDeleteTruck={(id) => dbStore.deleteTruck(id)}
          />
        )}

        {activeTab === 'drivers' && (
          <DriversView
            drivers={drivers}
            onCreateDriver={(data) => dbStore.createDriver(data)}
            onUpdateDriverStatus={(id, status) => dbStore.updateDriver(id, { status })}
            onDeleteDriver={(id) => dbStore.deleteDriver(id)}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesAndPartsView
            expenses={expenses}
            spareParts={spareParts}
            trips={enrichedTrips}
            onDeleteExpense={(id) => dbStore.deleteExpense(id)}
            onDeleteSparePart={(id) => dbStore.deleteSparePart(id)}
            onSelectTrip={(id) => setSelectedTripId(id)}
          />
        )}

        {activeTab === 'schema' && <SchemaStudioView />}
      </main>


      {/* Modals */}
      {updatingTrip && (
        <UpdateTripModal
          trip={updatingTrip}
          onClose={() => setUpdatingTripId(null)}
          onUpdateStatus={(id, status) => dbStore.updateTrip(id, { status })}
          onAddDelayLog={(id, log) => dbStore.addDelayLog(id, log)}
          onRemoveDelayLog={(id, logId) => dbStore.removeDelayLog(id, logId)}
          onAddExpense={(id, exp) => dbStore.createExpense({ trip_id: id, ...exp })}
          onDeleteExpense={(id) => dbStore.deleteExpense(id)}
          onAddSparePart={(id, part) => dbStore.createSparePart({ trip_id: id, ...part })}
          onDeleteSparePart={(id) => dbStore.deleteSparePart(id)}
        />
      )}

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTripId(null)}
          onOpenUpdateModal={(id) => setUpdatingTripId(id)}
          onUpdateStatus={(id, status) => dbStore.updateTrip(id, { status })}
          onAddDelayLog={(id, log) => dbStore.addDelayLog(id, log)}
          onRemoveDelayLog={(id, logId) => dbStore.removeDelayLog(id, logId)}
          onAddExpense={(id, exp) => dbStore.createExpense({ trip_id: id, ...exp })}
          onDeleteExpense={(id) => dbStore.deleteExpense(id)}
          onAddSparePart={(id, part) => dbStore.createSparePart({ trip_id: id, ...part })}
          onDeleteSparePart={(id) => dbStore.deleteSparePart(id)}
        />
      )}

      {showNewTripModal && (
        <NewTripModal
          trucks={trucks}
          drivers={drivers}
          onClose={() => setShowNewTripModal(false)}
          onCreateTrip={(data) => {
            const newTrip = dbStore.createTrip(data);
            setUpdatingTripId(newTrip.id);
          }}
        />
      )}

      {/* Reset Database Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset Sample Database?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore all Trucks, Drivers, Trips, Expenses, and Spare Parts back to the original JCQ General Supply Company demo seed dataset. Any newly created records will be replaced.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  dbStore.resetToDefault();
                  setShowResetConfirm(false);
                  setResetSuccessToast(true);
                  setTimeout(() => setResetSuccessToast(false), 3000);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
