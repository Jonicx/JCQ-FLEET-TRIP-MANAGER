import {
  Truck,
  Driver,
  Trip,
  Expense,
  SparePart,
  DelayLog,
  EnrichedTrip,
  DatabaseStats,
  TruckStatus,
  DriverStatus,
  TripStatus,
  ExpenseType,
  CreateTripPayload,
} from '../types/database.ts';
import {
  INITIAL_TRUCKS,
  INITIAL_DRIVERS,
  INITIAL_TRIPS,
  INITIAL_EXPENSES,
  INITIAL_SPARE_PARTS,
} from './initialData.ts';

const STORAGE_KEY_PREFIX = 'jcq_fleet_db_v1_';

class DatabaseStore {
  private trucks: Truck[] = [];
  private drivers: Driver[] = [];
  private trips: Trip[] = [];
  private expenses: Expense[] = [];
  private spareParts: SparePart[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedTrucks = localStorage.getItem(`${STORAGE_KEY_PREFIX}trucks`);
      const storedDrivers = localStorage.getItem(`${STORAGE_KEY_PREFIX}drivers`);
      const storedTrips = localStorage.getItem(`${STORAGE_KEY_PREFIX}trips`);
      const storedExpenses = localStorage.getItem(`${STORAGE_KEY_PREFIX}expenses`);
      const storedSpareParts = localStorage.getItem(`${STORAGE_KEY_PREFIX}spare_parts`);

      this.trucks = storedTrucks ? JSON.parse(storedTrucks) : [...INITIAL_TRUCKS];
      this.drivers = storedDrivers ? JSON.parse(storedDrivers) : [...INITIAL_DRIVERS];
      this.trips = storedTrips ? JSON.parse(storedTrips) : [...INITIAL_TRIPS];
      this.expenses = storedExpenses ? JSON.parse(storedExpenses) : [...INITIAL_EXPENSES];
      this.spareParts = storedSpareParts ? JSON.parse(storedSpareParts) : [...INITIAL_SPARE_PARTS];
    } catch {
      this.trucks = [...INITIAL_TRUCKS];
      this.drivers = [...INITIAL_DRIVERS];
      this.trips = [...INITIAL_TRIPS];
      this.expenses = [...INITIAL_EXPENSES];
      this.spareParts = [...INITIAL_SPARE_PARTS];
    }
  }

  private persist() {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}trucks`, JSON.stringify(this.trucks));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}drivers`, JSON.stringify(this.drivers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}trips`, JSON.stringify(this.trips));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}expenses`, JSON.stringify(this.expenses));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}spare_parts`, JSON.stringify(this.spareParts));
    } catch (e) {
      console.error('Failed to persist to localStorage', e);
    }
    this.notify();
  }

  public subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public resetToDefault() {
    this.trucks = JSON.parse(JSON.stringify(INITIAL_TRUCKS));
    this.drivers = JSON.parse(JSON.stringify(INITIAL_DRIVERS));
    this.trips = JSON.parse(JSON.stringify(INITIAL_TRIPS));
    this.expenses = JSON.parse(JSON.stringify(INITIAL_EXPENSES));
    this.spareParts = JSON.parse(JSON.stringify(INITIAL_SPARE_PARTS));
    this.persist();
  }

  // --- TRUCKS (CRUD & FK integrity) ---
  public getTrucks(): Truck[] {
    return [...this.trucks];
  }

  public getTruck(id: string): Truck | undefined {
    return this.trucks.find((t) => t.id === id);
  }

  public createTruck(truckData: Omit<Truck, 'id' | 'created_at' | 'updated_at'>): Truck {
    const existing = this.trucks.find(
      (t) => t.license_plate.toUpperCase().trim() === truckData.license_plate.toUpperCase().trim()
    );
    if (existing) {
      throw new Error(`UNIQUE Constraint Error: Truck license plate '${truckData.license_plate}' already exists.`);
    }

    const now = new Date().toISOString();
    const newTruck: Truck = {
      ...truckData,
      id: crypto.randomUUID(),
      license_plate: truckData.license_plate.toUpperCase().trim(),
      created_at: now,
      updated_at: now,
    };
    this.trucks.unshift(newTruck);
    this.persist();
    return newTruck;
  }

  public updateTruck(id: string, updates: Partial<Omit<Truck, 'id' | 'created_at'>>): Truck {
    const index = this.trucks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Truck ${id} not found.`);

    if (updates.license_plate) {
      const duplicate = this.trucks.find(
        (t) => t.id !== id && t.license_plate.toUpperCase().trim() === updates.license_plate!.toUpperCase().trim()
      );
      if (duplicate) {
        throw new Error(`UNIQUE Constraint Error: License plate '${updates.license_plate}' already exists.`);
      }
    }

    this.trucks[index] = {
      ...this.trucks[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.trucks[index];
  }

  public deleteTruck(id: string) {
    // Foreign Key Constraint Check: ON DELETE RESTRICT
    const linkedTrip = this.trips.find((trip) => trip.truck_id === id);
    if (linkedTrip) {
      throw new Error(
        `Foreign Key Constraint Violation (ON DELETE RESTRICT): Cannot delete truck ${id} because it is referenced by trip ${linkedTrip.id}.`
      );
    }

    this.trucks = this.trucks.filter((t) => t.id !== id);
    this.persist();
  }

  // --- DRIVERS (CRUD & FK integrity) ---
  public getDrivers(): Driver[] {
    return [...this.drivers];
  }

  public getDriver(id: string): Driver | undefined {
    return this.drivers.find((d) => d.id === id);
  }

  public createDriver(driverData: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): Driver {
    const existing = this.drivers.find(
      (d) => d.license_number.toUpperCase().trim() === driverData.license_number.toUpperCase().trim()
    );
    if (existing) {
      throw new Error(`UNIQUE Constraint Error: Driver license number '${driverData.license_number}' already exists.`);
    }

    const now = new Date().toISOString();
    const newDriver: Driver = {
      ...driverData,
      id: crypto.randomUUID(),
      license_number: driverData.license_number.toUpperCase().trim(),
      created_at: now,
      updated_at: now,
    };
    this.drivers.unshift(newDriver);
    this.persist();
    return newDriver;
  }

  public updateDriver(id: string, updates: Partial<Omit<Driver, 'id' | 'created_at'>>): Driver {
    const index = this.drivers.findIndex((d) => d.id === id);
    if (index === -1) throw new Error(`Driver ${id} not found.`);

    if (updates.license_number) {
      const duplicate = this.drivers.find(
        (d) => d.id !== id && d.license_number.toUpperCase().trim() === updates.license_number!.toUpperCase().trim()
      );
      if (duplicate) {
        throw new Error(`UNIQUE Constraint Error: License number '${updates.license_number}' already exists.`);
      }
    }

    this.drivers[index] = {
      ...this.drivers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.drivers[index];
  }

  public deleteDriver(id: string) {
    // Foreign Key Constraint Check: ON DELETE RESTRICT
    const linkedTrip = this.trips.find((trip) => trip.driver_id === id);
    if (linkedTrip) {
      throw new Error(
        `Foreign Key Constraint Violation (ON DELETE RESTRICT): Cannot delete driver ${id} because it is referenced by trip ${linkedTrip.id}.`
      );
    }

    this.drivers = this.drivers.filter((d) => d.id !== id);
    this.persist();
  }

  // --- TRIPS (Associations, Status, Dynamic Logs, Budget) ---
  public getTrips(): Trip[] {
    return [...this.trips];
  }

  public getEnrichedTrips(): EnrichedTrip[] {
    return this.trips.map((trip) => {
      const truck = this.trucks.find((t) => t.id === trip.truck_id);
      const driver = this.drivers.find((d) => d.id === trip.driver_id);
      const expenses = this.expenses.filter((e) => e.trip_id === trip.id);
      const spare_parts = this.spareParts.filter((sp) => sp.trip_id === trip.id);

      const total_expenses =
        trip.status === 'Completed' && trip.total_expenses_cost !== undefined
          ? Number(trip.total_expenses_cost)
          : expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const total_spare_parts =
        trip.status === 'Completed' && trip.total_spare_parts_cost !== undefined
          ? Number(trip.total_spare_parts_cost)
          : spare_parts.reduce((sum, sp) => sum + Number(sp.price), 0);

      const driver_pay = Number(trip.driver_pay) || 0;
      const total_spent = total_expenses + total_spare_parts + driver_pay;
      const budget = Number(trip.budget_allocated) || 0;
      const remaining_budget = budget - total_spent;
      const budget_utilization_pct = budget > 0 ? (total_spent / budget) * 100 : 0;
      const is_over_budget = total_spent > budget;

      // Exact Formula: Profit/Loss = Budget Allocated - (Driver Pay + Total Expenses + Total Spare Parts Cost)
      const profit_loss =
        trip.final_profit_loss !== undefined
          ? Number(trip.final_profit_loss)
          : budget - (driver_pay + total_expenses + total_spare_parts);

      const financial_flag: 'Profitable' | 'Loss' =
        trip.financial_flag ?? (profit_loss >= 0 ? 'Profitable' : 'Loss');

      return {
        ...trip,
        truck,
        driver,
        expenses,
        spare_parts,
        driver_pay,
        total_expenses,
        total_spare_parts,
        total_spent,
        remaining_budget,
        budget_utilization_pct,
        is_over_budget,
        profit_loss,
        financial_flag,
      };
    });
  }

  public getEnrichedTrip(id: string): EnrichedTrip | undefined {
    return this.getEnrichedTrips().find((t) => t.id === id);
  }

  public createTrip(payload: CreateTripPayload): Trip {
    // 1. Validate required fields
    if (!payload.origin?.trim()) {
      throw new Error('Trip Origin is required.');
    }
    if (!payload.destination?.trim()) {
      throw new Error('Trip Destination is required.');
    }
    if (!payload.scheduled_start) {
      throw new Error('Scheduled Start departure date is required.');
    }
    if (!payload.scheduled_end) {
      throw new Error('Scheduled End arrival date is required.');
    }

    const startDate = new Date(payload.scheduled_start).getTime();
    const endDate = new Date(payload.scheduled_end).getTime();
    if (isNaN(startDate) || isNaN(endDate)) {
      throw new Error('Invalid scheduled start or end date format.');
    }
    if (endDate < startDate) {
      throw new Error('Scheduled End Date cannot be earlier than Scheduled Start Date.');
    }

    // 2. Validate monetary amounts
    const budgetNum = Number(payload.budget_allocated);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      throw new Error('Budget Allocated must be a valid positive amount greater than $0.');
    }

    const driverPayNum = Number(payload.driver_pay);
    if (isNaN(driverPayNum) || driverPayNum < 0) {
      throw new Error('Driver Pay must be a valid non-negative amount ($0 or greater).');
    }

    // 3. Double-Booking Prevention & Referential Integrity
    const truck = this.trucks.find((t) => t.id === payload.truck_id);
    if (!truck) {
      throw new Error(`Referential Error: Selected Truck ID '${payload.truck_id}' does not exist.`);
    }
    if (truck.status !== 'Available') {
      throw new Error(
        `Double-Booking Prevention: Truck '${truck.license_plate}' (${truck.model}) is currently '${truck.status}' and cannot be dispatched.`
      );
    }

    const driver = this.drivers.find((d) => d.id === payload.driver_id);
    if (!driver) {
      throw new Error(`Referential Error: Selected Driver ID '${payload.driver_id}' does not exist.`);
    }
    if (driver.status !== 'Available') {
      throw new Error(
        `Double-Booking Prevention: Driver '${driver.full_name}' is currently '${driver.status}' and cannot be dispatched.`
      );
    }

    // 4. Validate initial expenses if provided
    if (payload.initial_expenses && payload.initial_expenses.length > 0) {
      for (let i = 0; i < payload.initial_expenses.length; i++) {
        const exp = payload.initial_expenses[i];
        if (!exp.expense_type) {
          throw new Error(`Initial expense #${i + 1} must have a valid Expense Type.`);
        }
        const expAmount = Number(exp.amount);
        if (isNaN(expAmount) || expAmount <= 0) {
          throw new Error(`Initial expense #${i + 1} (${exp.expense_type}): Amount must be greater than $0.`);
        }
      }
    }

    // 5. Validate initial spare parts if provided
    if (payload.initial_spare_parts && payload.initial_spare_parts.length > 0) {
      for (let i = 0; i < payload.initial_spare_parts.length; i++) {
        const sp = payload.initial_spare_parts[i];
        if (!sp.part_name?.trim()) {
          throw new Error(`Initial spare part #${i + 1} must have a Part Name.`);
        }
        const spPrice = Number(sp.price);
        if (isNaN(spPrice) || spPrice < 0) {
          throw new Error(`Initial spare part #${i + 1} ('${sp.part_name}'): Price must be $0 or greater.`);
        }
      }
    }

    // 6. Instantiate new Trip with status automatically set to 'Ongoing'
    const now = new Date().toISOString();
    const tripId = crypto.randomUUID();

    const newTrip: Trip = {
      id: tripId,
      truck_id: truck.id,
      driver_id: driver.id,
      status: 'Ongoing', // automatically switch to 'Ongoing'
      origin: payload.origin.trim(),
      destination: payload.destination.trim(),
      scheduled_start: new Date(payload.scheduled_start).toISOString(),
      scheduled_end: new Date(payload.scheduled_end).toISOString(),
      budget_allocated: budgetNum,
      driver_pay: driverPayNum,
      cargo_type: payload.cargo_type?.trim() || 'General Cargo',
      notes: payload.notes?.trim() || '',
      delay_logs: [],
      created_at: now,
      updated_at: now,
    };

    this.trips.unshift(newTrip);

    // 7. Atomically update corresponding Truck and Driver statuses to 'On Trip' to prevent double-booking
    this.updateTruckStatusInternal(truck.id, 'On Trip');
    this.updateDriverStatusInternal(driver.id, 'On Trip');

    // 8. Insert initial expenses (if any)
    if (payload.initial_expenses && payload.initial_expenses.length > 0) {
      for (const exp of payload.initial_expenses) {
        this.expenses.push({
          id: crypto.randomUUID(),
          trip_id: tripId,
          expense_type: exp.expense_type,
          amount: Number(exp.amount),
          description: exp.description?.trim() || `Launch expense (${exp.expense_type})`,
          timestamp: now,
          created_at: now,
        });
      }
    }

    // 9. Insert initial spare parts (if any)
    if (payload.initial_spare_parts && payload.initial_spare_parts.length > 0) {
      for (const sp of payload.initial_spare_parts) {
        this.spareParts.push({
          id: crypto.randomUUID(),
          trip_id: tripId,
          part_name: sp.part_name.trim(),
          price: Number(sp.price),
          description: sp.description?.trim() || 'Launch maintenance item',
          replaced_by: 'JCQ Launch Inspection Depot',
          timestamp: now,
          created_at: now,
        });
      }
    }

    this.persist();
    return newTrip;
  }

  public completeTrip(id: string): Trip {
    return this.updateTrip(id, { status: 'Completed' });
  }

  public updateTrip(id: string, updates: Partial<Omit<Trip, 'id' | 'created_at'>>): Trip {
    const index = this.trips.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Trip ${id} not found.`);

    const oldTrip = this.trips[index];

    // Prevent any further modifications or mid-trip updates to the trip once its status is marked as 'Completed'
    if (oldTrip.status === 'Completed') {
      throw new Error(
        `Forbidden: Trip ${id} is marked as Completed and finalized. No further modifications, mid-trip updates, or status changes are permitted.`
      );
    }

    // Referential checks
    if (updates.truck_id && updates.truck_id !== oldTrip.truck_id) {
      const truck = this.trucks.find((t) => t.id === updates.truck_id);
      if (!truck) throw new Error(`Foreign Key Violation: Truck ID ${updates.truck_id} does not exist.`);
    }
    if (updates.driver_id && updates.driver_id !== oldTrip.driver_id) {
      const driver = this.drivers.find((d) => d.id === updates.driver_id);
      if (!driver) throw new Error(`Foreign Key Violation: Driver ID ${updates.driver_id} does not exist.`);
    }

    const newStatus = updates.status || oldTrip.status;
    const effectiveTruckId = updates.truck_id || oldTrip.truck_id;
    const effectiveDriverId = updates.driver_id || oldTrip.driver_id;

    let completionCalculations: Partial<Trip> = {};

    // Handle status transitions
    if (updates.status && updates.status !== oldTrip.status) {
      if (newStatus === 'Ongoing') {
        this.updateTruckStatusInternal(effectiveTruckId, 'On Trip');
        this.updateDriverStatusInternal(effectiveDriverId, 'On Trip');
      } else if (newStatus === 'Completed') {
        // 1. Revert the assigned Truck and Driver statuses back to 'Available'
        this.updateTruckStatusInternal(effectiveTruckId, 'Available');
        this.updateDriverStatusInternal(effectiveDriverId, 'Available');

        // 2. Calculate the financial outcome using exact formula:
        // Profit/Loss = Budget Allocated - (Driver Pay + Total Expenses + Total Spare Parts Cost)
        const tripExpenses = this.expenses.filter((e) => e.trip_id === id);
        const tripSpareParts = this.spareParts.filter((sp) => sp.trip_id === id);
        const totalExpensesCost = tripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const totalSparePartsCost = tripSpareParts.reduce((sum, sp) => sum + Number(sp.price), 0);
        const budgetAllocated = Number(updates.budget_allocated ?? oldTrip.budget_allocated) || 0;
        const driverPay = Number(updates.driver_pay ?? oldTrip.driver_pay) || 0;

        const profitLoss = budgetAllocated - (driverPay + totalExpensesCost + totalSparePartsCost);

        // 4. If the result is positive (>= 0), flag the trip visually as 'Profitable'. If negative, flag it as a 'Loss'.
        const financialFlag: 'Profitable' | 'Loss' = profitLoss >= 0 ? 'Profitable' : 'Loss';

        // 3. Save the final financial result, Total Expenses, and Total Spare Parts Cost to the Trip record
        completionCalculations = {
          final_profit_loss: profitLoss,
          total_expenses_cost: totalExpensesCost,
          total_spare_parts_cost: totalSparePartsCost,
          financial_flag: financialFlag,
          completed_at: oldTrip.completed_at || new Date().toISOString(),
        };
      } else if (newStatus === 'Planned' && oldTrip.status === 'Ongoing') {
        this.updateTruckStatusInternal(effectiveTruckId, 'Available');
        this.updateDriverStatusInternal(effectiveDriverId, 'Available');
      }
    }

    this.trips[index] = {
      ...oldTrip,
      ...updates,
      ...completionCalculations,
      updated_at: new Date().toISOString(),
    };

    this.persist();
    return this.trips[index];
  }

  public deleteTrip(id: string) {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) return;

    // Reset truck and driver status if ongoing
    if (trip.status === 'Ongoing') {
      this.updateTruckStatusInternal(trip.truck_id, 'Available');
      this.updateDriverStatusInternal(trip.driver_id, 'Available');
    }

    // ON DELETE CASCADE: Delete associated expenses & spare parts
    this.expenses = this.expenses.filter((e) => e.trip_id !== id);
    this.spareParts = this.spareParts.filter((sp) => sp.trip_id !== id);
    this.trips = this.trips.filter((t) => t.id !== id);

    this.persist();
  }

  // --- DYNAMIC DELAY LOGS (Dynamic logs with timestamps) ---
  public addDelayLog(tripId: string, logData: Omit<DelayLog, 'id' | 'trip_id' | 'timestamp'> & { timestamp?: string }): DelayLog {
    const tripIndex = this.trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) throw new Error(`Trip ${tripId} not found.`);

    if (this.trips[tripIndex].status === 'Completed') {
      throw new Error(`Forbidden: Trip ${tripId} is marked as Completed. No further delays can be documented.`);
    }

    const newLog: DelayLog = {
      id: crypto.randomUUID(),
      trip_id: tripId,
      reason: logData.reason,
      severity: logData.severity,
      location: logData.location,
      duration_minutes: logData.duration_minutes || 0,
      timestamp: logData.timestamp || new Date().toISOString(),
    };

    this.trips[tripIndex].delay_logs = [
      newLog,
      ...(this.trips[tripIndex].delay_logs || []),
    ];
    this.trips[tripIndex].updated_at = new Date().toISOString();

    this.persist();
    return newLog;
  }

  public removeDelayLog(tripId: string, logId: string) {
    const tripIndex = this.trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return;

    if (this.trips[tripIndex].status === 'Completed') {
      throw new Error(`Forbidden: Trip ${tripId} is marked as Completed. Delay records are locked.`);
    }

    this.trips[tripIndex].delay_logs = (this.trips[tripIndex].delay_logs || []).filter((l) => l.id !== logId);
    this.trips[tripIndex].updated_at = new Date().toISOString();
    this.persist();
  }

  // --- EXPENSES (Trip ID, Type, Amount, Description, Timestamp) ---
  public getExpenses(tripId?: string): Expense[] {
    if (tripId) {
      return this.expenses.filter((e) => e.trip_id === tripId);
    }
    return [...this.expenses];
  }

  public createExpense(data: Omit<Expense, 'id' | 'created_at' | 'timestamp'> & { timestamp?: string }): Expense {
    // Foreign key check
    const trip = this.trips.find((t) => t.id === data.trip_id);
    if (!trip) throw new Error(`Foreign Key Violation: Trip ID ${data.trip_id} does not exist.`);

    if (trip.status === 'Completed') {
      throw new Error(`Forbidden: Cannot add mid-trip expenses to completed trip ${data.trip_id}. Trip records are finalized and locked.`);
    }

    if (data.amount <= 0) {
      throw new Error(`CHECK Constraint Violation: Expense amount must be strictly greater than 0.`);
    }

    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      amount: Number(data.amount),
      timestamp: data.timestamp || now,
      created_at: now,
    };

    this.expenses.unshift(newExpense);
    this.persist();
    return newExpense;
  }

  public deleteExpense(id: string) {
    const exp = this.expenses.find((e) => e.id === id);
    if (exp) {
      const trip = this.trips.find((t) => t.id === exp.trip_id);
      if (trip && trip.status === 'Completed') {
        throw new Error(`Forbidden: Cannot delete expenses from completed trip ${trip.id}. Trip records are locked.`);
      }
    }

    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.persist();
  }

  // --- SPARE PARTS (Trip ID, Part Name, Price, Description, Timestamp) ---
  public getSpareParts(tripId?: string): SparePart[] {
    if (tripId) {
      return this.spareParts.filter((sp) => sp.trip_id === tripId);
    }
    return [...this.spareParts];
  }

  public createSparePart(data: Omit<SparePart, 'id' | 'created_at' | 'timestamp'> & { timestamp?: string }): SparePart {
    // Foreign key check
    const trip = this.trips.find((t) => t.id === data.trip_id);
    if (!trip) throw new Error(`Foreign Key Violation: Trip ID ${data.trip_id} does not exist.`);

    if (trip.status === 'Completed') {
      throw new Error(`Forbidden: Cannot add roadside spare parts to completed trip ${data.trip_id}. Trip records are finalized and locked.`);
    }

    if (data.price < 0) {
      throw new Error(`CHECK Constraint Violation: Spare part price cannot be negative.`);
    }

    const now = new Date().toISOString();
    const newPart: SparePart = {
      ...data,
      id: crypto.randomUUID(),
      price: Number(data.price),
      timestamp: data.timestamp || now,
      created_at: now,
    };

    this.spareParts.unshift(newPart);
    this.persist();
    return newPart;
  }

  public deleteSparePart(id: string) {
    const sp = this.spareParts.find((p) => p.id === id);
    if (sp) {
      const trip = this.trips.find((t) => t.id === sp.trip_id);
      if (trip && trip.status === 'Completed') {
        throw new Error(`Forbidden: Cannot delete spare parts from completed trip ${trip.id}. Trip records are locked.`);
      }
    }

    this.spareParts = this.spareParts.filter((sp) => sp.id !== id);
    this.persist();
  }

  // --- STATS & KPIS ---
  public getStats(): DatabaseStats {
    const totalTrucks = this.trucks.length;
    const availableTrucks = this.trucks.filter((t) => t.status === 'Available').length;
    const onTripTrucks = this.trucks.filter((t) => t.status === 'On Trip').length;
    const maintenanceTrucks = this.trucks.filter((t) => t.status === 'Maintenance').length;

    const totalDrivers = this.drivers.length;
    const availableDrivers = this.drivers.filter((d) => d.status === 'Available').length;

    const totalTrips = this.trips.length;
    const ongoingTrips = this.trips.filter((t) => t.status === 'Ongoing').length;
    const completedTrips = this.trips.filter((t) => t.status === 'Completed').length;
    const plannedTrips = this.trips.filter((t) => t.status === 'Planned').length;

    const totalBudgetAllocated = this.trips.reduce((sum, t) => sum + (Number(t.budget_allocated) || 0), 0);
    const totalActualExpenses = this.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalSparePartsCost = this.spareParts.reduce((sum, sp) => sum + (Number(sp.price) || 0), 0);
    const netVariance = totalBudgetAllocated - (totalActualExpenses + totalSparePartsCost);

    const completedTripsList = this.trips.filter((t) => t.status === 'Completed');
    const totalProfitRealized = completedTripsList.reduce(
      (sum, t) => sum + (Number(t.final_profit_loss) || 0),
      0
    );
    const profitableTripsCount = completedTripsList.filter(
      (t) => t.financial_flag === 'Profitable' || (t.final_profit_loss !== undefined && Number(t.final_profit_loss) >= 0)
    ).length;
    const lossTripsCount = completedTripsList.filter(
      (t) => t.financial_flag === 'Loss' || (t.final_profit_loss !== undefined && Number(t.final_profit_loss) < 0)
    ).length;

    return {
      totalTrucks,
      availableTrucks,
      onTripTrucks,
      maintenanceTrucks,
      totalDrivers,
      availableDrivers,
      totalTrips,
      ongoingTrips,
      completedTrips,
      plannedTrips,
      totalBudgetAllocated,
      totalActualExpenses,
      totalSparePartsCost,
      netVariance,
      totalProfitRealized,
      profitableTripsCount,
      lossTripsCount,
    };
  }

  // Internal helpers
  private updateTruckStatusInternal(truckId: string, status: TruckStatus) {
    const idx = this.trucks.findIndex((t) => t.id === truckId);
    if (idx !== -1) {
      this.trucks[idx] = {
        ...this.trucks[idx],
        status,
        updated_at: new Date().toISOString(),
      };
    }
  }

  private updateDriverStatusInternal(driverId: string, status: DriverStatus) {
    const idx = this.drivers.findIndex((d) => d.id === driverId);
    if (idx !== -1) {
      this.drivers[idx] = {
        ...this.drivers[idx],
        status,
        updated_at: new Date().toISOString(),
      };
    }
  }

  // --- INTERACTIVE SQL QUERY RUNNER FOR SCHEMA STUDIO ---
  public executeMockSql(query: string): { columns: string[]; rows: any[]; rowCount: number; executionTimeMs: number } {
    const startTime = performance.now();
    const clean = query.trim().replace(/;$/, '');
    const lower = clean.toLowerCase();

    let columns: string[] = [];
    let rows: any[] = [];

    if (lower.startsWith('select') && lower.includes('from trucks')) {
      columns = ['id', 'license_plate', 'model', 'status', 'year', 'capacity_tons', 'current_mileage'];
      rows = this.trucks.map((t) => ({
        id: t.id.slice(0, 8) + '...',
        license_plate: t.license_plate,
        model: t.model,
        status: t.status,
        year: t.year || 'N/A',
        capacity_tons: `${t.capacity_tons} T`,
        current_mileage: `${t.current_mileage?.toLocaleString()} km`,
      }));
    } else if (lower.startsWith('select') && lower.includes('from drivers')) {
      columns = ['id', 'full_name', 'license_number', 'phone', 'status', 'experience_years'];
      rows = this.drivers.map((d) => ({
        id: d.id.slice(0, 8) + '...',
        full_name: d.full_name,
        license_number: d.license_number,
        phone: d.phone,
        status: d.status,
        experience_years: `${d.experience_years} yrs`,
      }));
    } else if (lower.startsWith('select') && lower.includes('from trips') && lower.includes('join')) {
      // Joined trip report
      columns = ['trip_id', 'origin', 'destination', 'truck_plate', 'driver_name', 'status', 'budget_allocated', 'total_spent'];
      rows = this.getEnrichedTrips().map((t) => ({
        trip_id: t.id.slice(0, 8) + '...',
        origin: t.origin,
        destination: t.destination,
        truck_plate: t.truck?.license_plate || 'Unassigned',
        driver_name: t.driver?.full_name || 'Unassigned',
        status: t.status,
        budget_allocated: `$${t.budget_allocated.toLocaleString()}`,
        total_spent: `$${t.total_spent.toLocaleString()}`,
      }));
    } else if (lower.startsWith('select') && lower.includes('from trips')) {
      columns = ['id', 'truck_id', 'driver_id', 'origin', 'destination', 'status', 'budget_allocated'];
      rows = this.trips.map((t) => ({
        id: t.id.slice(0, 8) + '...',
        truck_id: t.truck_id.slice(0, 8) + '...',
        driver_id: t.driver_id.slice(0, 8) + '...',
        origin: t.origin,
        destination: t.destination,
        status: t.status,
        budget_allocated: `$${t.budget_allocated.toLocaleString()}`,
      }));
    } else if (lower.startsWith('select') && lower.includes('from expenses') && lower.includes('group by expense_type')) {
      columns = ['expense_type', 'transaction_count', 'total_amount'];
      const map: Record<string, { count: number; total: number }> = {};
      this.expenses.forEach((e) => {
        if (!map[e.expense_type]) map[e.expense_type] = { count: 0, total: 0 };
        map[e.expense_type].count += 1;
        map[e.expense_type].total += Number(e.amount);
      });
      rows = Object.entries(map).map(([type, data]) => ({
        expense_type: type,
        transaction_count: data.count,
        total_amount: `$${data.total.toFixed(2)}`,
      }));
    } else if (lower.startsWith('select') && lower.includes('from expenses')) {
      columns = ['id', 'trip_id', 'expense_type', 'amount', 'description', 'timestamp'];
      rows = this.expenses.map((e) => ({
        id: e.id.slice(0, 8) + '...',
        trip_id: e.trip_id.slice(0, 8) + '...',
        expense_type: e.expense_type,
        amount: `$${Number(e.amount).toFixed(2)}`,
        description: e.description || '-',
        timestamp: new Date(e.timestamp).toLocaleDateString(),
      }));
    } else if (lower.startsWith('select') && lower.includes('from spare_parts')) {
      columns = ['id', 'trip_id', 'part_name', 'price', 'replaced_by', 'timestamp'];
      rows = this.spareParts.map((sp) => ({
        id: sp.id.slice(0, 8) + '...',
        trip_id: sp.trip_id.slice(0, 8) + '...',
        part_name: sp.part_name,
        price: `$${Number(sp.price).toFixed(2)}`,
        replaced_by: sp.replaced_by || 'Field Workshop',
        timestamp: new Date(sp.timestamp).toLocaleDateString(),
      }));
    } else if (lower.startsWith('select') && lower.includes('from trip_delay_logs')) {
      columns = ['id', 'trip_id', 'reason', 'severity', 'duration_min', 'timestamp'];
      const allLogs = this.trips.flatMap((t) => t.delay_logs || []);
      rows = allLogs.map((l) => ({
        id: l.id.slice(0, 8) + '...',
        trip_id: l.trip_id.slice(0, 8) + '...',
        reason: l.reason,
        severity: l.severity,
        duration_min: `${l.duration_minutes || 0}m`,
        timestamp: new Date(l.timestamp).toLocaleString(),
      }));
    } else {
      // Default summary view
      columns = ['table_name', 'record_count', 'primary_key', 'foreign_keys', 'indexes'];
      rows = [
        {
          table_name: 'trucks',
          record_count: this.trucks.length,
          primary_key: 'id (UUID)',
          foreign_keys: 'None',
          indexes: 'PRIMARY, license_plate (UNIQUE)',
        },
        {
          table_name: 'drivers',
          record_count: this.drivers.length,
          primary_key: 'id (UUID)',
          foreign_keys: 'None',
          indexes: 'PRIMARY, license_number (UNIQUE)',
        },
        {
          table_name: 'trips',
          record_count: this.trips.length,
          primary_key: 'id (UUID)',
          foreign_keys: 'truck_id, driver_id',
          indexes: 'idx_trips_truck_id, idx_trips_driver_id, idx_trips_status',
        },
        {
          table_name: 'trip_delay_logs',
          record_count: this.trips.flatMap((t) => t.delay_logs || []).length,
          primary_key: 'id (UUID)',
          foreign_keys: 'trip_id (CASCADE)',
          indexes: 'idx_trip_delay_logs_trip_id, idx_trip_delay_logs_timestamp',
        },
        {
          table_name: 'expenses',
          record_count: this.expenses.length,
          primary_key: 'id (UUID)',
          foreign_keys: 'trip_id (CASCADE)',
          indexes: 'idx_expenses_trip_id, idx_expenses_type, idx_expenses_timestamp',
        },
        {
          table_name: 'spare_parts',
          record_count: this.spareParts.length,
          primary_key: 'id (UUID)',
          foreign_keys: 'trip_id (CASCADE)',
          indexes: 'idx_spare_parts_trip_id, idx_spare_parts_timestamp',
        },
      ];
    }

    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
    };
  }
}

export const dbStore = new DatabaseStore();
