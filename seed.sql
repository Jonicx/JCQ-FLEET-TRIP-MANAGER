-- ============================================================================
-- JCQ General Supply Company: Seed Data Script
-- ============================================================================

-- Clean existing data (Optional for fresh installations)
TRUNCATE TABLE spare_parts, expenses, trip_delay_logs, trips, drivers, trucks CASCADE;

-- Insert Trucks
INSERT INTO trucks (id, license_plate, model, status, year, capacity_tons, current_mileage) VALUES
('b1111111-1111-1111-1111-111111111111', 'RAE 482B', 'Scania R500 V8 Heavy Hauler', 'On Trip', 2021, 32.0, 142500),
('b2222222-2222-2222-2222-222222222222', 'RAF 915C', 'Volvo FH16 750 Globetrotter', 'Available', 2022, 35.0, 98400),
('b3333333-3333-3333-3333-333333333333', 'RAG 204D', 'Mercedes-Benz Actros 3340', 'Maintenance', 2019, 28.0, 215300),
('b4444444-4444-4444-4444-444444444444', 'RAH 731E', 'Isuzu Giga Heavy Duty 6x4', 'On Trip', 2020, 25.0, 178900),
('b5555555-5555-5555-5555-555555555555', 'RAJ 118F', 'MAN TGX 26.540 EfficientLine', 'Available', 2023, 30.0, 45200);

-- Insert Drivers
INSERT INTO drivers (id, full_name, license_number, phone, status, experience_years) VALUES
('d1111111-1111-1111-1111-111111111111', 'Jean-Claude Mugisha', 'DL-RW-882910', '+250 788 123 456', 'On Trip', 11),
('d2222222-2222-2222-2222-222222222222', 'Emmanuel Habimana', 'DL-RW-447192', '+250 783 987 654', 'Available', 8),
('d3333333-3333-3333-3333-333333333333', 'Patrick Nshimiyimana', 'DL-RW-331084', '+250 782 555 123', 'On Trip', 14),
('d4444444-4444-4444-4444-444444444444', 'Olivier Tuyisenge', 'DL-RW-661298', '+250 781 444 888', 'Off Duty', 5),
('d5555555-5555-5555-5555-555555555555', 'Innocent Kwizera', 'DL-RW-902187', '+250 785 777 999', 'Available', 9);

-- Insert Trips
INSERT INTO trips (id, truck_id, driver_id, status, origin, destination, scheduled_start, scheduled_end, budget_allocated, driver_pay, cargo_type, notes, delay_reasons) VALUES
(
    't1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'Ongoing',
    'Kigali Central Depot, Rwanda',
    'Mombasa Port Gateway, Kenya',
    '2026-09-28 06:00:00+00',
    '2026-10-03 18:00:00+00',
    3400.00,
    450.00,
    '30 Tons Industrial Cement & Steel Clamps',
    'High priority contract for Northern Corridor transit.',
    ARRAY['Border customs clearance queue at Malaba', 'Heavy rainstorm near Eldoret']
),
(
    't2222222-2222-2222-2222-222222222222',
    'b4444444-4444-4444-4444-444444444444',
    'd3333333-3333-3333-3333-333333333333',
    'Ongoing',
    'Dar es Salaam Harbour, Tanzania',
    'Kigali Bumbogo Logistics Hub',
    '2026-09-29 08:30:00+00',
    '2026-10-04 14:00:00+00',
    2850.00,
    380.00,
    '24 Tons Bulk Fertilizer & Agricultural Feed',
    'Central Corridor corridor route via Rusumo border.',
    ARRAY['Weighbridge calibration inspection at Dodoma']
),
(
    't3333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222',
    'd2222222-2222-2222-2222-222222222222',
    'Completed',
    'Kigali Special Economic Zone',
    'Rubavu Cross-Border Market',
    '2026-09-22 05:00:00+00',
    '2026-09-24 16:00:00+00',
    1200.00,
    180.00,
    '28 Tons Packaged Rice & Grain Provisions',
    'Delivered ahead of schedule, zero cargo loss.',
    ARRAY[]::TEXT[]
),
(
    't4444444-4444-4444-4444-444444444444',
    'b5555555-5555-5555-5555-555555555555',
    'd5555555-5555-5555-5555-555555555555',
    'Planned',
    'Huye Regional Distribution Center',
    'Musanze Construction Site B',
    '2026-10-05 07:00:00+00',
    '2026-10-07 19:00:00+00',
    950.00,
    150.00,
    '18 Tons Roofing Sheets & Timber Planks',
    'Pending loading dock verification on Monday morning.',
    ARRAY[]::TEXT[]
);

-- Insert Delay Logs for Trips
INSERT INTO trip_delay_logs (id, trip_id, reason, severity, location, duration_minutes, timestamp) VALUES
('l1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'Border customs clearance queue at Malaba OSBP', 'High', 'Malaba Border Post', 240, '2026-09-29 14:15:00+00'),
('l2222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'Heavy rainstorm near Eldoret causing mountain road slow-down', 'Medium', 'Eldoret Escarpment', 110, '2026-09-30 19:40:00+00'),
('l3333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', 'Weighbridge calibration inspection at Dodoma bypass', 'Low', 'Dodoma Weighbridge #3', 75, '2026-09-30 11:20:00+00');

-- Insert Expenses (Fuel, Tolls, Police/Bribes, Food, Other)
INSERT INTO expenses (id, trip_id, expense_type, amount, description, timestamp) VALUES
('e1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'Fuel', 1150.00, 'Diesel 700L refill at TotalEnergies Eldoret Depot', '2026-09-28 16:30:00+00'),
('e2222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'Tolls', 85.00, 'Uganda-Kenya Transit Highway Toll Gate Fee', '2026-09-29 09:10:00+00'),
('e3333333-3333-3333-3333-333333333333', 't1111111-1111-1111-1111-111111111111', 'Police/Bribes', 45.00, 'Highway patrol checkpoint inspection clearance cash payment', '2026-09-29 18:45:00+00'),
('e4444444-4444-4444-4444-444444444444', 't1111111-1111-1111-1111-111111111111', 'Food', 60.00, 'Driver and turnboy meals allowance (3 days)', '2026-09-30 12:00:00+00'),
('e5555555-5555-5555-5555-555555555555', 't1111111-1111-1111-1111-111111111111', 'Other', 35.00, 'Secure overnight truck yard parking fee in Nakuru', '2026-09-30 21:15:00+00'),
('e6666666-6666-6666-6666-666666666666', 't2222222-2222-2222-2222-222222222222', 'Fuel', 920.00, '550L Diesel pump refill in Morogoro', '2026-09-29 14:00:00+00'),
('e7777777-7777-7777-7777-777777777777', 't2222222-2222-2222-2222-222222222222', 'Tolls', 65.00, 'TanRoads interstate transit toll receipt', '2026-09-30 08:30:00+00'),
('e8888888-8888-8888-8888-888888888888', 't2222222-2222-2222-2222-222222222222', 'Police/Bribes', 30.00, 'Informal transit clearance fee at rural bypass', '2026-09-30 17:15:00+00'),
('e9999999-9999-9999-9999-999999999999', 't3333333-3333-3333-3333-333333333333', 'Fuel', 480.00, 'Local roundtrip diesel supply', '2026-09-22 06:15:00+00'),
('eaa11111-1111-1111-1111-111111111111', 't3333333-3333-3333-3333-333333333333', 'Food', 40.00, 'Driver lunch & subsistence stipend', '2026-09-23 13:00:00+00');

-- Insert Spare Parts (Maintenance required during trips)
INSERT INTO spare_parts (id, trip_id, part_name, price, description, replaced_by, timestamp) VALUES
('s1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'Heavy Duty Drive Axle Tire (315/80R22.5)', 380.00, 'Emergency tire blowout replacement after sharp debris on highway', 'Nakuru Roadside Auto & Tires', '2026-09-30 15:45:00+00'),
('s2222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'Air Brake Hose Coupling Valve', 45.00, 'Replaced leaking pressure air line valve', 'Mechanic Juma QuickFix', '2026-09-30 17:20:00+00'),
('s3333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', 'Fan Belt & Alternator Tensioner', 110.00, 'Squeaking fan belt snapped on climb, replaced along with tensioner', 'Dodoma Heavy Fleet Spares', '2026-09-30 16:00:00+00');
