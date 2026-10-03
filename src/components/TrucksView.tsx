import React, { useState } from 'react';
import {
  Truck as TruckIcon,
  Plus,
  Search,
  Wrench,
  CheckCircle2,
  Navigation2,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { Truck, TruckStatus } from '../types/database.ts';

interface TrucksViewProps {
  trucks: Truck[];
  onCreateTruck: (truck: Omit<Truck, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTruckStatus: (id: string, status: TruckStatus) => void;
  onDeleteTruck: (id: string) => void;
}

export const TrucksView: React.FC<TrucksViewProps> = ({
  trucks,
  onCreateTruck,
  onUpdateTruckStatus,
  onDeleteTruck,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TruckStatus>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [licensePlate, setLicensePlate] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<TruckStatus>('Available');
  const [year, setYear] = useState('2022');
  const [capacityTons, setCapacityTons] = useState('30');
  const [currentMileage, setCurrentMileage] = useState('80000');

  const filteredTrucks = trucks.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch =
      t.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.model.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      onCreateTruck({
        license_plate: licensePlate.trim().toUpperCase(),
        model: model.trim(),
        status,
        year: parseInt(year) || undefined,
        capacity_tons: parseFloat(capacityTons) || undefined,
        current_mileage: parseInt(currentMileage) || 0,
      });
      setLicensePlate('');
      setModel('');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create truck.');
    }
  };

  const handleDelete = (id: string) => {
    setErrorMsg(null);
    try {
      onDeleteTruck(id);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Fleet Trucks Management</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {trucks.length} Units
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Heavy haulage vehicle inventory, availability state, and maintenance status tracking
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Heavy Truck</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by license plate or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Available', 'On Trip', 'Maintenance'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
              {st !== 'All' && (
                <span className="ml-1 text-[10px] opacity-75">
                  ({trucks.filter((t) => t.status === st).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trucks Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[13px] text-slate-600 md:min-w-0 md:text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider md:text-[10px]">
              <tr>
                <th className="py-3.5 px-4">License Plate</th>
                <th className="py-3.5 px-4">Model &amp; Specs</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Haul Capacity</th>
                <th className="py-3.5 px-4">Odometer Mileage</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrucks.map((truck) => (
                <tr key={truck.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                    {truck.license_plate}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-900">{truck.model}</div>
                    <div className="text-xs text-slate-400 md:text-[11px]">Year: {truck.year || 'N/A'}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold md:text-[10px] ${
                        truck.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : truck.status === 'On Trip'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {truck.status === 'Available' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {truck.status === 'On Trip' && <Navigation2 className="h-3 w-3 mr-1" />}
                      {truck.status === 'Maintenance' && <Wrench className="h-3 w-3 mr-1" />}
                      {truck.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-700">
                    {truck.capacity_tons ? `${truck.capacity_tons} Tons` : '-'}
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-700">
                    {truck.current_mileage ? `${truck.current_mileage.toLocaleString()} km` : '0 km'}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* Toggle Maintenance */}
                      {truck.status !== 'On Trip' && (
                        <button
                          onClick={() =>
                            onUpdateTruckStatus(
                              truck.id,
                              truck.status === 'Maintenance' ? 'Available' : 'Maintenance'
                            )
                          }
                          title={truck.status === 'Maintenance' ? 'Mark as Available' : 'Send to Maintenance'}
                          className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition md:text-[11px]"
                        >
                          {truck.status === 'Maintenance' ? 'Finish Service' : 'Service Truck'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(truck.id)}
                        title="Delete Truck (Protected by FK ON DELETE RESTRICT)"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Truck Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TruckIcon className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold">Register New Fleet Truck</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  License Plate * (UNIQUE)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RAK 392G"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Model &amp; Manufacturer *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scania G460 Heavy Hauler"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TruckStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  >
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="On Trip">On Trip</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Manufacturing Year
                  </label>
                  <input
                    type="number"
                    min="1995"
                    max="2027"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Capacity (Tons)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={capacityTons}
                    onChange={(e) => setCapacityTons(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Odometer (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentMileage}
                    onChange={(e) => setCurrentMileage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
                >
                  Save Truck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
