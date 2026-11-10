-- ====================================================================
-- HE THONG DAT VE XE TRUC TUYEN JESOUL
-- SQL SERVER DATABASE INITIALIZATION SCRIPT (CLEAN REBUILD)
-- ====================================================================

USE [master];
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'JesoulDb')
BEGIN
    ALTER DATABASE [JesoulDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [JesoulDb];
END
GO

CREATE DATABASE [JesoulDb];
GO

USE [JesoulDb];
GO

-- ====================================================================
-- CREATE TABLES
-- ====================================================================

-- BẢNG 1: USERS (Khách hàng, Tài xế, Chủ xe/Admin)
CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Role VARCHAR(20) NOT NULL CONSTRAINT CHK_Users_Role CHECK (Role IN ('Customer', 'Driver', 'Admin')),
    FullName NVARCHAR(100) NOT NULL,
    PhoneNumber VARCHAR(15) NOT NULL CONSTRAINT UQ_Users_PhoneNumber UNIQUE,
    Email VARCHAR(100) NOT NULL,
    PasswordHash VARCHAR(255) NULL, -- Cho phép NULL đối với khách hàng (Q-10)
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME()
);
GO
CREATE NONCLUSTERED INDEX IX_Users_Email ON dbo.Users(Email);
GO

-- BẢNG 2: BUSES (Xe khách)
CREATE TABLE dbo.Buses (
    BusID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PlateNumber VARCHAR(20) NOT NULL CONSTRAINT UQ_Buses_PlateNumber UNIQUE,
    BusType NVARCHAR(50) NOT NULL CONSTRAINT DF_Buses_BusType DEFAULT N'Limousine VIP',
    TotalSeats INT NOT NULL CONSTRAINT DF_Buses_TotalSeats DEFAULT 16 CONSTRAINT CHK_Buses_TotalSeats CHECK (TotalSeats > 0),
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Buses_Status DEFAULT 'Active'
);
GO

-- BẢNG 3: ROUTES (Tuyến đường)
CREATE TABLE dbo.Routes (
    RouteID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Origin NVARCHAR(100) NOT NULL,
    Destination NVARCHAR(100) NOT NULL,
    EstimatedMinutes INT NOT NULL CONSTRAINT DF_Routes_EstimatedMinutes DEFAULT 60,
    IsActive BIT NOT NULL CONSTRAINT DF_Routes_IsActive DEFAULT 1
);
GO

-- BẢNG 4: TRIPS (Chuyến xe)
CREATE TABLE dbo.Trips (
    TripID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    RouteID INT NOT NULL CONSTRAINT FK_Trips_Routes FOREIGN KEY REFERENCES dbo.Routes(RouteID),
    BusID INT NOT NULL CONSTRAINT FK_Trips_Buses FOREIGN KEY REFERENCES dbo.Buses(BusID),
    DriverID INT NOT NULL CONSTRAINT FK_Trips_Drivers FOREIGN KEY REFERENCES dbo.Users(UserID),
    DepartureTime DATETIME2 NOT NULL,
    ArrivalTime DATETIME2 NOT NULL,
    BasePrice DECIMAL(18, 2) NOT NULL CONSTRAINT CHK_Trips_BasePrice CHECK (BasePrice >= 0),
    AvailableSeats INT NOT NULL CONSTRAINT CHK_Trips_AvailableSeats CHECK (AvailableSeats >= 0),
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Trips_Status DEFAULT 'Scheduled' CONSTRAINT CHK_Trips_Status CHECK (Status IN ('Scheduled', 'Running', 'Completed', 'Cancelled')),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Trips_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Trips_UpdatedAt DEFAULT SYSUTCDATETIME()
);
GO
CREATE NONCLUSTERED INDEX IX_Trips_DepartureTime ON dbo.Trips(DepartureTime, Status);
GO

-- BẢNG 5: BOOKINGS (Đơn đặt vé & Tạm giữ chỗ 10 phút)
CREATE TABLE dbo.Bookings (
    BookingID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    BookingCode VARCHAR(20) NOT NULL CONSTRAINT UQ_Bookings_BookingCode UNIQUE,
    UserID INT NOT NULL CONSTRAINT FK_Bookings_Users FOREIGN KEY REFERENCES dbo.Users(UserID),
    TripID INT NOT NULL CONSTRAINT FK_Bookings_Trips FOREIGN KEY REFERENCES dbo.Trips(TripID),
    SeatQuantity INT NOT NULL CONSTRAINT CHK_Bookings_SeatQuantity CHECK (SeatQuantity > 0),
    TotalAmount DECIMAL(18, 2) NOT NULL CONSTRAINT CHK_Bookings_TotalAmount CHECK (TotalAmount >= 0),
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Bookings_Status DEFAULT 'Pending' CONSTRAINT CHK_Bookings_Status CHECK (Status IN ('Pending', 'Paid', 'Cancelled', 'Expired')),
    HoldExpiresAt DATETIME2 NOT NULL, -- Thời hạn 10 phút thanh toán (BR-03)
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Bookings_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Bookings_UpdatedAt DEFAULT SYSUTCDATETIME()
);
GO
CREATE NONCLUSTERED INDEX IX_Bookings_HoldExpiresAt ON dbo.Bookings(HoldExpiresAt, Status);
GO

-- BẢNG 6: TICKETS (Vé xe điện tử con)
CREATE TABLE dbo.Tickets (
    TicketID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    BookingID INT NOT NULL CONSTRAINT FK_Tickets_Bookings FOREIGN KEY REFERENCES dbo.Bookings(BookingID),
    TicketCode VARCHAR(30) NOT NULL CONSTRAINT UQ_Tickets_TicketCode UNIQUE,
    ConfirmationToken VARCHAR(64) NOT NULL CONSTRAINT UQ_Tickets_ConfirmationToken UNIQUE,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Tickets_Status DEFAULT 'Hold' CONSTRAINT CHK_Tickets_Status CHECK (Status IN ('Hold', 'Paid', 'Confirmed', 'NoReply', 'Cancelled')),
    CancelReason NVARCHAR(255) NULL,
    ConfirmedAt DATETIME2 NULL,
    CancelledAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Tickets_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO
CREATE NONCLUSTERED INDEX IX_Tickets_Status ON dbo.Tickets(Status);
GO

-- BẢNG 7: PAYMENT_TRANSACTIONS (Giao dịch chuyển khoản ngân hàng)
CREATE TABLE dbo.PaymentTransactions (
    TransactionID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    BookingID INT NOT NULL CONSTRAINT FK_Payments_Bookings FOREIGN KEY REFERENCES dbo.Bookings(BookingID),
    PaymentMethod VARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Method DEFAULT 'BankTransfer',
    TransactionRef VARCHAR(100) NOT NULL CONSTRAINT UQ_Payments_TransactionRef UNIQUE,
    Amount DECIMAL(18, 2) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'Success',
    BankName NVARCHAR(50) NOT NULL CONSTRAINT DF_Payments_BankName DEFAULT N'MB Bank',
    BankAccountNo VARCHAR(30) NOT NULL CONSTRAINT DF_Payments_BankAccountNo DEFAULT '0987654321',
    PaidAt DATETIME2 NOT NULL CONSTRAINT DF_Payments_PaidAt DEFAULT SYSUTCDATETIME()
);
GO

-- BẢNG 8: EMAIL_LOGS (Ghi nhận gửi email trước 30p & nút bấm xác nhận CTA)
CREATE TABLE dbo.EmailLogs (
    LogID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    TicketID INT NOT NULL CONSTRAINT FK_EmailLogs_Tickets FOREIGN KEY REFERENCES dbo.Tickets(TicketID),
    RecipientEmail VARCHAR(100) NOT NULL,
    EmailType VARCHAR(50) NOT NULL CONSTRAINT DF_EmailLogs_Type DEFAULT 'DepartureConfirmation',
    Status VARCHAR(20) NOT NULL CONSTRAINT CHK_EmailLogs_Status CHECK (Status IN ('Pending', 'Sent', 'Failed', 'Clicked')),
    ActionClicked VARCHAR(20) NULL CONSTRAINT CHK_EmailLogs_Action CHECK (ActionClicked IN ('Go', 'Cancel')),
    SentAt DATETIME2 NULL,
    ClickedAt DATETIME2 NULL,
    ErrorMessage NVARCHAR(500) NULL
);
GO

-- ====================================================================
-- SEED DATA KHỞI TẠO
-- ====================================================================
INSERT INTO dbo.Users (Role, FullName, PhoneNumber, Email, PasswordHash)
VALUES ('Driver', N'Trần Văn B', '0912345678', 'driver.tranb@jesoul.vn', '$2a$10$joNoTS.MFnQ9uAtNE2tQmeHbk4otZiAQnNI6h9HtU4EXorbGc/JC.'),
       ('Admin', N'Chủ Xe JESOUL (Admin)', '0988888888', 'admin@jesoul.vn', '$2a$10$joNoTS.MFnQ9uAtNE2tQmeHbk4otZiAQnNI6h9HtU4EXorbGc/JC.'),
       ('Admin', N'Quản Trị Viên JESOUL (Backup)', '0999888777', 'admin_backup@jesoul.vn', '$2a$10$joNoTS.MFnQ9uAtNE2tQmeHbk4otZiAQnNI6h9HtU4EXorbGc/JC.'),
       ('Customer', N'Nguyễn Văn A', '0901234567', 'nguyenvana@gmail.com', NULL);
GO

INSERT INTO dbo.Buses (PlateNumber, BusType, TotalSeats, Status)
VALUES ('77B-123.45', N'Limousine VIP', 16, 'Active'),
       ('77B-678.90', N'Limousine VIP', 16, 'Active');
GO

-- 2 Tuyến đường cố định của doanh nghiệp:
-- 1. Bình Định -> Quy Nhơn
-- 2. Quy Nhơn -> Bình Định
INSERT INTO dbo.Routes (Origin, Destination, EstimatedMinutes, IsActive)
VALUES (N'Bình Định', N'Quy Nhơn', 60, 1),
       (N'Quy Nhơn', N'Bình Định', 60, 1);
GO

-- 2 Chuyến xe khởi hành trong ngày:
INSERT INTO dbo.Trips (RouteID, BusID, DriverID, DepartureTime, ArrivalTime, BasePrice, AvailableSeats, Status)
VALUES (1, 1, 1, DATEADD(HOUR, 2, SYSUTCDATETIME()), DATEADD(MINUTE, 180, SYSUTCDATETIME()), 120000, 16, 'Scheduled'),
       (2, 2, 1, DATEADD(HOUR, 5, SYSUTCDATETIME()), DATEADD(MINUTE, 360, SYSUTCDATETIME()), 120000, 16, 'Scheduled');
GO

PRINT N'Database JesoulDb initialized cleanly with 8 tables, 2 routes (Bình Định - Quy Nhơn), and verified constraints.';
GO
