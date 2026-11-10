-- ====================================================================
-- HE THONG DAT VE XE TRUC TUYEN JESOUL
-- POSTGRESQL INITIALIZATION SCRIPT (RENDER / SUPABASE / NEON)
-- ====================================================================

-- 1. BẢNG USERS
CREATE TABLE IF NOT EXISTS "Users" (
    "UserID" SERIAL PRIMARY KEY,
    "Role" VARCHAR(20) NOT NULL CHECK ("Role" IN ('Customer', 'Driver', 'Admin')),
    "FullName" VARCHAR(100) NOT NULL,
    "PhoneNumber" VARCHAR(15) NOT NULL UNIQUE,
    "Email" VARCHAR(100) NOT NULL,
    "PasswordHash" VARCHAR(255) NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_Users_Email" ON "Users"("Email");

-- 2. BẢNG BUSES
CREATE TABLE IF NOT EXISTS "Buses" (
    "BusID" SERIAL PRIMARY KEY,
    "PlateNumber" VARCHAR(20) NOT NULL UNIQUE,
    "BusType" VARCHAR(50) DEFAULT 'Limousine VIP' NOT NULL,
    "TotalSeats" INT DEFAULT 16 NOT NULL CHECK ("TotalSeats" > 0),
    "Status" VARCHAR(20) DEFAULT 'Active' NOT NULL
);

-- 3. BẢNG ROUTES
CREATE TABLE IF NOT EXISTS "Routes" (
    "RouteID" SERIAL PRIMARY KEY,
    "Origin" VARCHAR(100) NOT NULL,
    "Destination" VARCHAR(100) NOT NULL,
    "EstimatedMinutes" INT DEFAULT 60 NOT NULL,
    "IsActive" BOOLEAN DEFAULT TRUE NOT NULL
);

-- 4. BẢNG TRIPS
CREATE TABLE IF NOT EXISTS "Trips" (
    "TripID" SERIAL PRIMARY KEY,
    "RouteID" INT NOT NULL REFERENCES "Routes"("RouteID") ON DELETE CASCADE,
    "BusID" INT NOT NULL REFERENCES "Buses"("BusID") ON DELETE CASCADE,
    "DriverID" INT NOT NULL REFERENCES "Users"("UserID") ON DELETE CASCADE,
    "DepartureTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ArrivalTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "BasePrice" NUMERIC(18, 2) NOT NULL CHECK ("BasePrice" >= 0),
    "AvailableSeats" INT NOT NULL CHECK ("AvailableSeats" >= 0),
    "Status" VARCHAR(20) DEFAULT 'Scheduled' NOT NULL CHECK ("Status" IN ('Scheduled', 'Running', 'Completed', 'Cancelled')),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_Trips_DepartureTime" ON "Trips"("DepartureTime", "Status");

-- 5. BẢNG BOOKINGS
CREATE TABLE IF NOT EXISTS "Bookings" (
    "BookingID" SERIAL PRIMARY KEY,
    "BookingCode" VARCHAR(20) NOT NULL UNIQUE,
    "UserID" INT NOT NULL REFERENCES "Users"("UserID") ON DELETE CASCADE,
    "TripID" INT NOT NULL REFERENCES "Trips"("TripID") ON DELETE CASCADE,
    "SeatQuantity" INT NOT NULL CHECK ("SeatQuantity" > 0),
    "TotalAmount" NUMERIC(18, 2) NOT NULL CHECK ("TotalAmount" >= 0),
    "Status" VARCHAR(20) DEFAULT 'Pending' NOT NULL CHECK ("Status" IN ('Pending', 'Paid', 'Cancelled', 'Expired')),
    "HoldExpiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_Bookings_HoldExpiresAt" ON "Bookings"("HoldExpiresAt", "Status");

-- 6. BẢNG TICKETS
CREATE TABLE IF NOT EXISTS "Tickets" (
    "TicketID" SERIAL PRIMARY KEY,
    "BookingID" INT NOT NULL REFERENCES "Bookings"("BookingID") ON DELETE CASCADE,
    "TicketCode" VARCHAR(30) NOT NULL UNIQUE,
    "ConfirmationToken" VARCHAR(64) NOT NULL UNIQUE,
    "Status" VARCHAR(20) DEFAULT 'Hold' NOT NULL CHECK ("Status" IN ('Hold', 'Paid', 'Confirmed', 'NoReply', 'Cancelled')),
    "CancelReason" VARCHAR(255) NULL,
    "ConfirmedAt" TIMESTAMP WITH TIME ZONE NULL,
    "CancelledAt" TIMESTAMP WITH TIME ZONE NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IX_Tickets_Status" ON "Tickets"("Status");

-- 7. BẢNG PAYMENT_TRANSACTIONS
CREATE TABLE IF NOT EXISTS "PaymentTransactions" (
    "TransactionID" SERIAL PRIMARY KEY,
    "BookingID" INT NOT NULL REFERENCES "Bookings"("BookingID") ON DELETE CASCADE,
    "PaymentMethod" VARCHAR(20) DEFAULT 'BankTransfer' NOT NULL,
    "TransactionRef" VARCHAR(100) NOT NULL UNIQUE,
    "Amount" NUMERIC(18, 2) NOT NULL,
    "Status" VARCHAR(20) DEFAULT 'Success' NOT NULL,
    "BankName" VARCHAR(50) DEFAULT 'MB Bank' NOT NULL,
    "BankAccountNo" VARCHAR(30) DEFAULT '0987654321' NOT NULL,
    "PaidAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. BẢNG EMAIL_LOGS
CREATE TABLE IF NOT EXISTS "EmailLogs" (
    "LogID" SERIAL PRIMARY KEY,
    "TicketID" INT NOT NULL REFERENCES "Tickets"("TicketID") ON DELETE CASCADE,
    "RecipientEmail" VARCHAR(100) NOT NULL,
    "EmailType" VARCHAR(50) DEFAULT 'DepartureConfirmation' NOT NULL,
    "Status" VARCHAR(20) NOT NULL CHECK ("Status" IN ('Pending', 'Sent', 'Failed', 'Clicked')),
    "ActionClicked" VARCHAR(20) NULL CHECK ("ActionClicked" IN ('Go', 'Cancel')),
    "SentAt" TIMESTAMP WITH TIME ZONE NULL,
    "ClickedAt" TIMESTAMP WITH TIME ZONE NULL,
    "ErrorMessage" VARCHAR(500) NULL
);

-- SEED DATA KHỞI TẠO
INSERT INTO "Users" ("Role", "FullName", "PhoneNumber", "Email", "PasswordHash")
VALUES 
    ('Driver', 'Trần Văn B', '0912345678', 'driver.tranb@jesoul.vn', '$2a$10$joNoTS.MFnQ9uAtNE2tQmeHbk4otZiAQnNI6h9HtU4EXorbGc/JC.'),
    ('Admin', 'Chủ Xe JESOUL (Admin)', '0988888888', 'admin@jesoul.vn', '$2a$10$joNoTS.MFnQ9uAtNE2tQmeHbk4otZiAQnNI6h9HtU4EXorbGc/JC.'),
    ('Admin', 'Quản Trị Viên JESOUL (Backup)', '0999888777', 'admin_backup@jesoul.vn', '$2a$10$joNoTS.MFnQ9uAtNE2tQmeHbk4otZiAQnNI6h9HtU4EXorbGc/JC.'),
    ('Customer', 'Nguyễn Văn A', '0901234567', 'nguyenvana@gmail.com', NULL)
ON CONFLICT ("PhoneNumber") DO NOTHING;

INSERT INTO "Buses" ("PlateNumber", "BusType", "TotalSeats", "Status")
VALUES 
    ('77B-123.45', 'Limousine VIP', 16, 'Active'),
    ('77B-678.90', 'Limousine VIP', 16, 'Active')
ON CONFLICT ("PlateNumber") DO NOTHING;

INSERT INTO "Routes" ("Origin", "Destination", "EstimatedMinutes", "IsActive")
VALUES 
    ('Bình Định', 'Quy Nhơn', 60, TRUE),
    ('Quy Nhơn', 'Bình Định', 60, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO "Trips" ("TripID", "RouteID", "BusID", "DriverID", "DepartureTime", "ArrivalTime", "BasePrice", "AvailableSeats", "Status")
OVERRIDING SYSTEM VALUE
VALUES 
    (1, 1, 1, 1, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3 hours', 120000, 16, 'Scheduled'),
    (2, 2, 2, 1, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '6 hours', 120000, 16, 'Scheduled')
ON CONFLICT ("TripID") DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Trips"', 'TripID'), COALESCE(MAX("TripID"), 1)) FROM "Trips";

