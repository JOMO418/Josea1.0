# BACKEND BLUEPRINT - PRAM AUTO SPARES

**Last Updated:** 2025-12-21
**Database:** PostgreSQL via Prisma ORM
**Authentication:** JWT (JSON Web Tokens)
**Real-time:** Socket.IO
**Caching:** Redis (via ioredis)
**Background Jobs:** BullMQ

---

## TABLE OF CONTENTS

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Multi-Branch Filtering Architecture](#2-multi-branch-filtering-architecture)
3. [Data Models & Relationships](#3-data-models--relationships)
4. [API Endpoints Reference](#4-api-endpoints-reference)
5. [Real-time Events (Socket.IO)](#5-real-time-events-socketio)
6. [Critical Business Logic](#6-critical-business-logic)

---

## 1. AUTHENTICATION & AUTHORIZATION

### 1.1 Login Flow

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxyz123",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+254712345678",
    "role": "MANAGER",
    "branchId": "branch-xyz-123",
    "isActive": true,
    "lastLoginAt": "2025-12-21T10:30:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-12-21T10:30:00.000Z",
    "branch": {
      "id": "branch-xyz-123",
      "name": "Nairobi Branch",
      "location": "Nairobi, Kenya",
      "isHeadquarters": false,
      "isActive": true
    }
  }
}
```

**Response (Error 401):**
```json
{
  "message": "Invalid credentials"
}
```

**Server-Side Implementation:**
- Validates email and password
- Uses `bcryptjs` to compare hashed passwords
- Updates `lastLoginAt` timestamp
- Generates JWT with payload:
  ```javascript
  {
    id: user.id,
    role: user.role,           // OWNER, ADMIN, or MANAGER
    branchId: user.branchId,   // CRITICAL: Used for multi-branch filtering
    email: user.email
  }
  ```
- JWT expiry: 24h (configurable via `JWT_EXPIRES_IN` env var)

---

### 1.2 Token Usage

**All protected routes require:**

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Server-Side Middleware (`authenticate`):**
- Extracts token from `Authorization` header
- Verifies token using `JWT_SECRET`
- Decodes and attaches user info to `req.user`:
  ```javascript
  req.user = {
    id: "clxyz123",
    role: "MANAGER",
    branchId: "branch-xyz-123",
    email: "user@example.com"
  }
  ```
- Returns 401 if token is missing, invalid, or expired

---

### 1.3 Role-Based Authorization

**Middleware:** `authorize(...roles)`

**Roles Hierarchy:**
1. **OWNER** - Full system access (all branches, all operations)
2. **ADMIN** - Multi-branch access, can approve transfers, override prices
3. **MANAGER** - Single branch access only (limited to their assigned branch)

**Usage Example:**
```javascript
// Only OWNER and ADMIN can access
router.put('/:id/approve', authenticate, authorize('OWNER', 'ADMIN'), controller)

// All authenticated users can access
router.get('/', authenticate, controller)
```

---

### 1.4 Get Current User

**Endpoint:** `GET /api/auth/me`

**Required Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "clxyz123",
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+254712345678",
  "role": "MANAGER",
  "branchId": "branch-xyz-123",
  "isActive": true,
  "lastLoginAt": "2025-12-21T10:30:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-12-21T10:30:00.000Z",
  "branch": {
    "id": "branch-xyz-123",
    "name": "Nairobi Branch",
    "location": "Nairobi, Kenya",
    "isHeadquarters": false,
    "isActive": true
  }
}
```

---

### 1.5 Logout

**Endpoint:** `POST /api/auth/logout`

**Required Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Note:** JWT is stateless. Logout is client-side (delete token). Server can implement token blacklisting via Redis if needed.

---

## 2. MULTI-BRANCH FILTERING ARCHITECTURE

### 2.1 How It Works

**SOURCE OF TRUTH:** The `branchId` stored in the JWT token payload (set during login).

**Server-Side Filtering:**

1. **For MANAGERS (Branch-Level Access):**
   - `branchId` is **always** extracted from `req.user.branchId` (from JWT)
   - Cannot query other branches (enforced server-side)
   - Even if frontend sends a different `branchId` in query params, server ignores it and uses JWT value

2. **For OWNER/ADMIN (Global Access):**
   - Can query any branch by passing `branchId` in query params
   - If no `branchId` query param provided, returns data from ALL branches
   - Can switch between branches in frontend

**Implementation Pattern (from `inventoryController.js`):**
```javascript
exports.getInventory = async (req, res, next) => {
  const { branchId, lowStockOnly, productId } = req.query;

  // Branch managers can only see their own inventory
  let filterBranchId = branchId;
  if (req.user.role === 'MANAGER' && req.user.branchId) {
    filterBranchId = req.user.branchId; // Override with JWT value
  }

  const where = {};
  if (filterBranchId) where.branchId = filterBranchId;
  if (productId) where.productId = productId;

  const inventory = await prisma.inventory.findMany({
    where,
    include: { product: true, branch: true }
  });

  res.json(filtered);
};
```

**Implementation Pattern (from `salesController.js`):**
```javascript
exports.getSales = async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  const where = {};

  // Role-based filtering
  if (req.user.role === 'MANAGER') {
    // Managers can only see their branch sales
    where.branchId = req.user.branchId; // From JWT
  } else if (branchId) {
    // Admin/Owner can filter by specific branch
    where.branchId = branchId; // From query param
  }

  const sales = await prisma.sale.findMany({ where });
  res.json(sales);
};
```

---

### 2.2 Multi-Branch Filtering Rules

| Endpoint | MANAGER Access | OWNER/ADMIN Access |
|----------|----------------|-------------------|
| GET /api/inventory | Only `req.user.branchId` | All branches or filter by `?branchId=xyz` |
| GET /api/sales | Only `req.user.branchId` | All branches or filter by `?branchId=xyz` |
| GET /api/transfers | Transfers involving `req.user.branchId` (from/to) | All transfers or filter by `?branchId=xyz` |
| GET /api/dashboard/branch/:branchId | Only their own branch (:branchId must match JWT) | Any branch |
| POST /api/sales | Sale created for `req.user.branchId` | Sale created for `req.user.branchId` |

**Critical Security:** Frontend CANNOT bypass branch filtering for MANAGERS. The server always enforces `req.user.branchId` from JWT.

---

## 3. DATA MODELS & RELATIONSHIPS

### 3.1 Branch
```prisma
model Branch {
  id             String      @id @default(cuid())
  name           String
  location       String
  isHeadquarters Boolean     @default(false)
  phone          String?
  isActive       Boolean     @default(true)

  users          User[]
  inventory      Inventory[]
  sales          Sale[]
  transfersFrom  Transfer[]  @relation("TransferFrom")
  transfersTo    Transfer[]  @relation("TransferTo")
}
```

**Key Relationships:**
- One branch has many users
- One branch has many inventory records (one per product)
- One branch has many sales
- One branch can send/receive many transfers

---

### 3.2 User
```prisma
model User {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  phone       String?
  password    String   // bcrypt hashed
  role        Role     @default(MANAGER) // OWNER, ADMIN, MANAGER
  branchId    String?
  isActive    Boolean  @default(true)
  lastLoginAt DateTime?

  branch      Branch?  @relation(fields: [branchId], references: [id])
  sales       Sale[]
  auditLogs   AuditLog[]
}

enum Role {
  OWNER
  ADMIN
  MANAGER
}
```

**Key Points:**
- `branchId` is nullable for OWNER/ADMIN users (can be null for global access)
- `branchId` is required for MANAGER users
- Password is hashed with bcryptjs (salt rounds: 10)

---

### 3.3 Product
```prisma
model Product {
  id                String   @id @default(cuid())
  name              String
  description       String?
  partNumber        String?  @unique
  category          String?
  vehicleMake       String?
  vehicleModel      String?
  vehicleEngine     String?
  costPrice         Decimal  @db.Decimal(10, 2)
  minPrice          Decimal  @db.Decimal(10, 2)
  sellingPrice      Decimal  @db.Decimal(10, 2)
  lowStockThreshold Int      @default(5)
  isActive          Boolean  @default(true)

  inventory         Inventory[]
  saleItems         SaleItem[]
  transferItems     TransferItem[]
}
```

**Key Points:**
- `minPrice` enforces minimum selling price (can be overridden by ADMIN with reason)
- `sellingPrice` is the recommended retail price
- `costPrice` is the purchase/cost price

---

### 3.4 Inventory (Multi-Branch Stock)
```prisma
model Inventory {
  id        String   @id @default(cuid())
  productId String
  branchId  String
  quantity  Int      @default(0)
  version   Int      @default(0) // Optimistic locking

  product   Product  @relation(fields: [productId], references: [id])
  branch    Branch   @relation(fields: [branchId], references: [id])

  @@unique([productId, branchId]) // One inventory record per product per branch
}
```

**CRITICAL:** Inventory is stored per branch. Same product can have different quantities at different branches.

**Optimistic Locking:** `version` field prevents race conditions during stock updates.

---

### 3.5 Sale
```prisma
model Sale {
  id             String        @id @default(cuid())
  receiptNumber  String        @unique
  branchId       String
  userId         String
  customerName   String?
  customerPhone  String?
  subtotal       Decimal       @db.Decimal(10, 2)
  discount       Decimal       @db.Decimal(10, 2) @default(0)
  total          Decimal       @db.Decimal(10, 2)
  paymentMethod  PaymentMethod // CASH, MPESA, CREDIT
  isCredit       Boolean       @default(false)
  creditStatus   CreditStatus? // PENDING, PARTIAL, PAID
  isReversed     Boolean       @default(false)
  reversalReason String?
  reversedAt     DateTime?
  reversedBy     String?
  notes          String?
  createdAt      DateTime      @default(now())

  branch         Branch        @relation(fields: [branchId], references: [id])
  user           User          @relation(fields: [userId], references: [id])
  items          SaleItem[]
  creditPayments CreditPayment[]
}

enum PaymentMethod {
  CASH
  MPESA
  CREDIT
}

enum CreditStatus {
  PENDING
  PARTIAL
  PAID
}
```

**Key Points:**
- `receiptNumber` is auto-generated (format: `RCP{timestamp}{random4digits}`)
- Stock is deducted immediately when sale is created (even for CREDIT sales)
- Sales can be reversed by ADMIN (restores inventory)
- `isReversed` flag for soft deletion

---

### 3.6 Transfer (Inter-Branch Stock Movement)
```prisma
model Transfer {
  id               String         @id @default(cuid())
  transferNumber   String         @unique
  fromBranchId     String
  toBranchId       String
  status           TransferStatus @default(REQUESTED)
  requestedById    String
  approvedById     String?
  dispatchedById   String?
  receivedById     String?
  requestedAt      DateTime       @default(now())
  approvedAt       DateTime?
  dispatchedAt     DateTime?
  receivedAt       DateTime?
  parcelTracking   String?
  notes            String?
  discrepancyNotes String?

  fromBranch       Branch         @relation("TransferFrom", fields: [fromBranchId], references: [id])
  toBranch         Branch         @relation("TransferTo", fields: [toBranchId], references: [id])
  requestedBy      User           @relation("TransferRequestedBy", fields: [requestedById], references: [id])
  approvedBy       User?          @relation("TransferApprovedBy", fields: [approvedById], references: [id])
  dispatchedBy     User?          @relation("TransferDispatchedBy", fields: [dispatchedById], references: [id])
  receivedBy       User?          @relation("TransferReceivedBy", fields: [receivedById], references: [id])
  items            TransferItem[]
}

enum TransferStatus {
  REQUESTED
  APPROVED
  PACKED
  DISPATCHED
  RECEIVED
  RECEIVED_WITH_DISCREPANCY
  CANCELLED
}
```

**Transfer Workflow:**
1. **REQUESTED** - Manager requests transfer from another branch
2. **APPROVED** - Admin approves the request and sets approved quantities
3. **PACKED** - Items are packed (optional status)
4. **DISPATCHED** - Stock deducted from source branch, parcel tracking number added
5. **RECEIVED** - Stock added to destination branch
6. **RECEIVED_WITH_DISCREPANCY** - Received with quantity mismatches
7. **CANCELLED** - Transfer cancelled

---

## 4. API ENDPOINTS REFERENCE

### 4.1 Authentication Routes

#### POST /api/auth/login
**Auth Required:** No
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** See [1.1 Login Flow](#11-login-flow)

---

#### POST /api/auth/logout
**Auth Required:** Yes
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{ "message": "Logged out successfully" }
```

---

#### GET /api/auth/me
**Auth Required:** Yes
**Headers:** `Authorization: Bearer <token>`
**Response:** User object with branch details (see [1.4](#14-get-current-user))

---

### 4.2 Product Routes

#### GET /api/products
**Auth Required:** Yes
**Query Params:**
- `search` (optional) - Search by name, partNumber, vehicleMake, vehicleModel
- `category` (optional) - Filter by category
- `isActive` (optional) - Filter by active status (true/false)

**Response (200):**
```json
[
  {
    "id": "prod-123",
    "name": "Brake Pad - Toyota",
    "description": "Front brake pads",
    "partNumber": "BP-TOY-001",
    "category": "Brakes",
    "vehicleMake": "Toyota",
    "vehicleModel": "Corolla",
    "vehicleEngine": "1.8L",
    "costPrice": "2500.00",
    "minPrice": "3000.00",
    "sellingPrice": "3500.00",
    "lowStockThreshold": 5,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

#### GET /api/products/:id
**Auth Required:** Yes
**Response (200):** Single product object

---

#### POST /api/products
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:**
```json
{
  "name": "Oil Filter - Nissan",
  "description": "Engine oil filter",
  "partNumber": "OF-NIS-001",
  "category": "Filters",
  "vehicleMake": "Nissan",
  "vehicleModel": "X-Trail",
  "vehicleEngine": "2.0L",
  "costPrice": 500,
  "minPrice": 700,
  "sellingPrice": 850,
  "lowStockThreshold": 10
}
```
**Response (201):** Created product object

---

#### PUT /api/products/:id
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:** Same as POST (all fields optional)
**Response (200):** Updated product object

---

#### DELETE /api/products/:id
**Auth Required:** Yes (OWNER, ADMIN only)
**Response (200):**
```json
{ "message": "Product deleted successfully" }
```
**Note:** Soft delete (sets `isActive = false`)

---

### 4.3 Inventory Routes

#### GET /api/inventory
**Auth Required:** Yes
**Query Params:**
- `branchId` (optional) - Filter by branch (OWNER/ADMIN only, MANAGER auto-filtered)
- `productId` (optional) - Filter by product
- `lowStockOnly` (optional) - Show only low stock items (true/false)

**Response (200):**
```json
[
  {
    "id": "inv-123",
    "productId": "prod-123",
    "branchId": "branch-xyz",
    "quantity": 15,
    "version": 5,
    "updatedAt": "2025-12-21T10:00:00.000Z",
    "product": {
      "id": "prod-123",
      "name": "Brake Pad - Toyota",
      "partNumber": "BP-TOY-001",
      "sellingPrice": "3500.00",
      "lowStockThreshold": 5
    },
    "branch": {
      "id": "branch-xyz",
      "name": "Nairobi Branch",
      "location": "Nairobi, Kenya"
    }
  }
]
```

**Multi-Branch Filtering:**
- **MANAGER:** Always filtered by `req.user.branchId` (from JWT)
- **OWNER/ADMIN:** Can filter by `?branchId=xyz` or get all branches

---

#### PUT /api/inventory/adjust
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:**
```json
{
  "productId": "prod-123",
  "branchId": "branch-xyz",
  "quantity": 50,
  "reason": "Stock count adjustment - physical inventory"
}
```
**Response (200):**
```json
{
  "id": "inv-123",
  "productId": "prod-123",
  "branchId": "branch-xyz",
  "quantity": 50,
  "version": 6,
  "updatedAt": "2025-12-21T10:30:00.000Z",
  "product": { ... }
}
```

**Error (409) - Optimistic Locking Conflict:**
```json
{
  "message": "Inventory was modified by another process. Please retry."
}
```

**Real-time Events Emitted:**
- `inventory.updated` (to branch room)
- `inventory.updated` (to overseer room)
- `lowStock.alert` (if quantity <= threshold)

---

### 4.4 Sales Routes

#### POST /api/sales
**Auth Required:** Yes
**Body:**
```json
{
  "items": [
    {
      "productId": "prod-123",
      "quantity": 2,
      "unitPrice": 3500
    },
    {
      "productId": "prod-456",
      "quantity": 1,
      "unitPrice": 1200
    }
  ],
  "customerName": "John Doe",
  "customerPhone": "+254712345678",
  "paymentMethod": "CASH",
  "discount": 100
}
```

**Request Body Fields:**
- `items` (required, array) - List of sale items
  - `productId` (required)
  - `quantity` (required)
  - `unitPrice` (required) - Must be >= product.minPrice (enforced)
- `customerName` (optional for CASH/MPESA, required for CREDIT)
- `customerPhone` (optional for CASH/MPESA, required for CREDIT)
- `paymentMethod` (required) - "CASH", "MPESA", or "CREDIT"
- `discount` (optional, default: 0)

**Response (201):**
```json
{
  "id": "sale-123",
  "receiptNumber": "RCP17347890121234",
  "branchId": "branch-xyz",
  "userId": "user-123",
  "customerName": "John Doe",
  "customerPhone": "+254712345678",
  "subtotal": "8200.00",
  "discount": "100.00",
  "total": "8100.00",
  "paymentMethod": "CASH",
  "isCredit": false,
  "creditStatus": null,
  "isReversed": false,
  "createdAt": "2025-12-21T10:30:00.000Z",
  "branch": { ... },
  "user": {
    "id": "user-123",
    "name": "Jane Manager",
    "email": "jane@example.com"
  },
  "items": [
    {
      "id": "item-1",
      "saleId": "sale-123",
      "productId": "prod-123",
      "quantity": 2,
      "unitPrice": "3500.00",
      "total": "7000.00",
      "product": { ... }
    },
    {
      "id": "item-2",
      "saleId": "sale-123",
      "productId": "prod-456",
      "quantity": 1,
      "unitPrice": "1200.00",
      "total": "1200.00",
      "product": { ... }
    }
  ]
}
```

**Error (400) - Price Below Minimum:**
```json
{
  "message": "Cannot sell Brake Pad - Toyota at KES 2800.00. Minimum price is KES 3000.00. Contact admin for price override."
}
```

**Error (400) - Insufficient Stock:**
```json
{
  "message": "Insufficient stock for Brake Pad - Toyota. Available: 5, Requested: 10"
}
```

**Critical Business Logic:**
1. **Price Validation:** unitPrice must be >= product.minPrice (hard block)
2. **Stock Deduction:** Inventory is IMMEDIATELY deducted (even for CREDIT sales)
3. **Optimistic Locking:** Uses inventory.version to prevent race conditions
4. **Audit Trail:** All inventory changes are logged
5. **Real-time Alerts:** Low stock alerts if quantity <= lowStockThreshold

**Real-time Events Emitted:**
- `sale.created` (to branch room)
- `sale.created` (to overseer room)
- `inventory.updated` (to branch room)
- `lowStock.alert` (if applicable)

---

#### POST /api/sales/override-price
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:** Same as POST /api/sales, plus:
```json
{
  "items": [...],
  "overrideReason": "Customer is a bulk buyer with 20% discount agreement"
}
```

**Note:**
- Allows selling below minPrice
- `overrideReason` must be >= 10 characters
- Creates audit log entry with override details

---

#### GET /api/sales
**Auth Required:** Yes
**Query Params:**
- `branchId` (optional) - Filter by branch (OWNER/ADMIN only)
- `startDate` (optional) - ISO date string (e.g., "2025-12-01")
- `endDate` (optional) - ISO date string
- `paymentMethod` (optional) - "CASH", "MPESA", or "CREDIT"
- `isCredit` (optional) - "true" or "false"
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response (200):**
```json
{
  "data": [
    {
      "id": "sale-123",
      "receiptNumber": "RCP17347890121234",
      "branchId": "branch-xyz",
      "subtotal": "8200.00",
      "discount": "100.00",
      "total": "8100.00",
      "paymentMethod": "CASH",
      "isCredit": false,
      "creditStatus": null,
      "isReversed": false,
      "createdAt": "2025-12-21T10:30:00.000Z",
      "branch": { ... },
      "user": { ... },
      "items": [ ... ],
      "creditPayments": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Multi-Branch Filtering:**
- **MANAGER:** Only sees sales from `req.user.branchId`
- **OWNER/ADMIN:** Can filter by `?branchId=xyz` or see all branches

---

#### GET /api/sales/:id
**Auth Required:** Yes
**Response (200):** Single sale object with all details

**Access Control:**
- **MANAGER:** Can only view sales from their branch
- **OWNER/ADMIN:** Can view any sale

---

#### POST /api/sales/:id/payment
**Auth Required:** Yes
**Body:**
```json
{
  "amount": 5000,
  "paymentMethod": "CASH",
  "notes": "First installment"
}
```

**Response (200):**
```json
{
  "id": "sale-123",
  "receiptNumber": "RCP17347890121234",
  "total": "10000.00",
  "isCredit": true,
  "creditStatus": "PARTIAL",
  "creditPayments": [
    {
      "id": "payment-1",
      "saleId": "sale-123",
      "amount": "5000.00",
      "paymentMethod": "CASH",
      "notes": "First installment",
      "receivedBy": "user-123",
      "createdAt": "2025-12-21T11:00:00.000Z"
    }
  ],
  ...
}
```

**Credit Status Auto-Update:**
- **PENDING:** No payments made (totalPaid = 0)
- **PARTIAL:** Some payments made (0 < totalPaid < total)
- **PAID:** Fully paid (totalPaid >= total)

**Error (400) - Overpayment:**
```json
{
  "message": "Payment amount (6000) exceeds remaining balance (5000)"
}
```

**Real-time Events Emitted:**
- `payment.recorded` (to branch room)
- `payment.recorded` (to overseer room)

---

#### POST /api/sales/:id/reverse
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:**
```json
{
  "reason": "Customer returned defective product - full refund issued"
}
```

**Response (200):**
```json
{
  "message": "Sale reversed successfully",
  "sale": { ... }
}
```

**Critical Business Logic:**
1. Restores inventory for all sale items
2. Marks sale as `isReversed = true`
3. Creates audit log entry
4. Increments inventory.version (optimistic locking)

**Real-time Events Emitted:**
- `sale.reversed` (to branch room)
- `sale.reversed` (to overseer room)
- `inventory.updated` (to branch room)

---

### 4.5 Transfer Routes

#### POST /api/transfers/request
**Auth Required:** Yes
**Body:**
```json
{
  "fromBranchId": "branch-abc",
  "toBranchId": "branch-xyz",
  "items": [
    {
      "productId": "prod-123",
      "quantity": 10
    },
    {
      "productId": "prod-456",
      "quantity": 5
    }
  ],
  "notes": "Urgent - low stock at destination branch"
}
```

**Note:**
- `fromBranchId` defaults to `req.user.branchId` if not provided
- Creates transfer with status "REQUESTED"

**Response (201):**
```json
{
  "id": "transfer-123",
  "transferNumber": "TRN1734789012abcd",
  "fromBranchId": "branch-abc",
  "toBranchId": "branch-xyz",
  "status": "REQUESTED",
  "requestedById": "user-123",
  "requestedAt": "2025-12-21T12:00:00.000Z",
  "notes": "Urgent - low stock at destination branch",
  "fromBranch": { ... },
  "toBranch": { ... },
  "items": [
    {
      "id": "item-1",
      "transferId": "transfer-123",
      "productId": "prod-123",
      "quantityRequested": 10,
      "quantityApproved": null,
      "quantityDispatched": null,
      "quantityReceived": null,
      "product": { ... }
    }
  ]
}
```

---

#### PUT /api/transfers/:id/approve
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:**
```json
{
  "items": [
    {
      "id": "item-1",
      "quantityApproved": 8
    },
    {
      "id": "item-2",
      "quantityApproved": 5
    }
  ]
}
```

**Response (200):**
```json
{
  "id": "transfer-123",
  "status": "APPROVED",
  "approvedById": "user-admin",
  "approvedAt": "2025-12-21T12:30:00.000Z",
  "items": [
    {
      "id": "item-1",
      "quantityRequested": 10,
      "quantityApproved": 8,
      ...
    }
  ],
  ...
}
```

**Note:** Admin can approve a different quantity than requested.

---

#### PUT /api/transfers/:id/pack
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:** None
**Response (200):** Transfer object with status "PACKED"

---

#### PUT /api/transfers/:id/dispatch
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:**
```json
{
  "parcelTracking": "DHL-12345-KE"
}
```

**Response (200):**
```json
{
  "id": "transfer-123",
  "status": "DISPATCHED",
  "dispatchedById": "user-admin",
  "dispatchedAt": "2025-12-21T13:00:00.000Z",
  "parcelTracking": "DHL-12345-KE",
  ...
}
```

**Critical Business Logic:**
1. Validates sufficient stock at source branch
2. **Deducts inventory from source branch** (fromBranchId)
3. Sets `quantityDispatched` = `quantityApproved`
4. Uses optimistic locking (inventory.version)
5. Creates audit log entry

**Real-time Events Emitted:**
- `transfer.statusChanged` (to both branches and overseer)
- Cache invalidation: `inventory:${fromBranchId}:*`

---

#### PUT /api/transfers/:id/receive
**Auth Required:** Yes
**Body:**
```json
{
  "items": [
    {
      "id": "item-1",
      "quantityReceived": 8,
      "discrepancyReason": null
    },
    {
      "id": "item-2",
      "quantityReceived": 4,
      "discrepancyReason": "1 unit damaged in transit"
    }
  ],
  "discrepancyNotes": "Overall 1 unit short due to transit damage"
}
```

**Response (200):**
```json
{
  "id": "transfer-123",
  "status": "RECEIVED_WITH_DISCREPANCY",
  "receivedById": "user-123",
  "receivedAt": "2025-12-21T14:00:00.000Z",
  "discrepancyNotes": "Overall 1 unit short due to transit damage",
  "items": [
    {
      "id": "item-1",
      "quantityDispatched": 8,
      "quantityReceived": 8
    },
    {
      "id": "item-2",
      "quantityDispatched": 5,
      "quantityReceived": 4,
      "discrepancyReason": "1 unit damaged in transit"
    }
  ],
  ...
}
```

**Critical Business Logic:**
1. **Adds received quantity to destination branch inventory** (toBranchId)
2. Status set to "RECEIVED" if no discrepancies, "RECEIVED_WITH_DISCREPANCY" if mismatches
3. Uses `upsert` to create inventory if it doesn't exist for destination branch
4. Creates audit log entry

**Real-time Events Emitted:**
- `transfer.statusChanged` (to both branches and overseer)
- Cache invalidation: `inventory:${toBranchId}:*`, `dashboard:*`

---

#### PUT /api/transfers/:id/cancel
**Auth Required:** Yes (OWNER, ADMIN only)
**Body:**
```json
{
  "reason": "No longer needed - stock replenished through purchase"
}
```

**Response (200):**
```json
{
  "id": "transfer-123",
  "status": "CANCELLED",
  "notes": "...\n[CANCELLED: No longer needed - stock replenished through purchase]",
  ...
}
```

**Note:** Can only cancel transfers that haven't been dispatched yet.

---

#### GET /api/transfers
**Auth Required:** Yes
**Query Params:**
- `status` (optional) - Filter by status
- `branchId` (optional) - Filter by branch (from/to)
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response (200):**
```json
{
  "data": [
    {
      "id": "transfer-123",
      "transferNumber": "TRN1734789012abcd",
      "fromBranchId": "branch-abc",
      "toBranchId": "branch-xyz",
      "status": "DISPATCHED",
      "requestedAt": "2025-12-21T12:00:00.000Z",
      "dispatchedAt": "2025-12-21T13:00:00.000Z",
      "fromBranch": { ... },
      "toBranch": { ... },
      "items": [ ... ],
      "requestedBy": { "name": "John Manager" },
      "approvedBy": { "name": "Admin User" },
      "dispatchedBy": { "name": "Admin User" },
      "receivedBy": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "pages": 1
  }
}
```

**Multi-Branch Filtering:**
- **MANAGER:** Sees transfers involving their branch (fromBranchId OR toBranchId)
- **OWNER/ADMIN:** Can filter by `?branchId=xyz` or see all transfers

---

#### GET /api/transfers/:id
**Auth Required:** Yes
**Response (200):** Single transfer object with all details

---

### 4.6 Dashboard Routes

#### GET /api/dashboard/overseer
**Auth Required:** Yes (OWNER, ADMIN only)
**Response (200):**
```json
{
  "totalSalesToday": 125000.50,
  "salesByBranch": [
    {
      "branchId": "branch-abc",
      "branchName": "Nairobi Branch",
      "todaySales": 75000.00,
      "todayCount": 25
    },
    {
      "branchId": "branch-xyz",
      "branchName": "Mombasa Branch",
      "todaySales": 50000.50,
      "todayCount": 18
    }
  ],
  "totalStock": 5420,
  "lowStockCount": 12,
  "lowStockItems": [
    {
      "id": "inv-123",
      "productId": "prod-123",
      "branchId": "branch-abc",
      "quantity": 2,
      "productName": "Brake Pad - Toyota",
      "lowStockThreshold": 5,
      "branchName": "Nairobi Branch"
    }
  ],
  "outstandingCredit": 45000.00,
  "creditSalesCount": 8,
  "pendingTransfers": 3,
  "recentSales": [ ... ],
  "branches": [
    {
      "id": "branch-abc",
      "name": "Nairobi Branch",
      "location": "Nairobi, Kenya"
    },
    {
      "id": "branch-xyz",
      "name": "Mombasa Branch",
      "location": "Mombasa, Kenya"
    }
  ],
  "cached": false
}
```

**Caching:**
- Redis cache with TTL of 60 seconds (configurable via `CACHE_TTL_DASHBOARD`)
- Cached response includes `"cached": true`

---

#### GET /api/dashboard/branch/:branchId
**Auth Required:** Yes
**Response (200):**
```json
{
  "branch": {
    "id": "branch-abc",
    "name": "Nairobi Branch",
    "location": "Nairobi, Kenya",
    "isHeadquarters": false,
    "isActive": true
  },
  "todaySales": 75000.00,
  "todaySalesCount": 25,
  "totalStock": 1250,
  "lowStockCount": 5,
  "lowStockItems": [ ... ],
  "outstandingCredit": 15000.00,
  "creditSalesCount": 3,
  "pendingTransfers": 1,
  "recentSales": [ ... ],
  "cached": false
}
```

**Access Control:**
- **MANAGER:** Can only access their own branch (:branchId must match req.user.branchId)
- **OWNER/ADMIN:** Can access any branch

**Caching:**
- Redis cache with TTL of 60 seconds

---

### 4.7 Audit Routes

#### GET /api/audit
**Auth Required:** Yes (OWNER, ADMIN only)
**Query Params:**
- `action` (optional) - Filter by action (e.g., "SALE_CREATED", "STOCK_ADJUSTED")
- `entityType` (optional) - Filter by entity (e.g., "Sale", "Inventory", "Transfer")
- `userId` (optional) - Filter by user ID
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `page` (optional, default: 1)
- `limit` (optional, default: 100)

**Response (200):**
```json
{
  "data": [
    {
      "id": "audit-123",
      "userId": "user-123",
      "action": "SALE_CREATED",
      "entityType": "Sale",
      "entityId": "sale-123",
      "oldValue": null,
      "newValue": {
        "receiptNumber": "RCP17347890121234",
        "total": "8100.00",
        "paymentMethod": "CASH",
        "itemCount": 2
      },
      "ipAddress": "192.168.1.10",
      "createdAt": "2025-12-21T10:30:00.000Z",
      "user": {
        "id": "user-123",
        "name": "Jane Manager",
        "email": "jane@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1500,
    "totalPages": 15
  }
}
```

**Common Audit Actions:**
- `SALE_CREATED`
- `SALE_CREATED_WITH_OVERRIDE`
- `SALE_REVERSED`
- `CREDIT_PAYMENT_RECORDED`
- `STOCK_ADJUSTED`
- `INVENTORY_DEDUCTED`
- `INVENTORY_RESTORED`
- `TRANSFER_REQUESTED`
- `TRANSFER_APPROVED`
- `TRANSFER_DISPATCHED`
- `TRANSFER_RECEIVED`
- `TRANSFER_CANCELLED`
- `PRICE_OVERRIDE`

---

#### GET /api/audit/export
**Auth Required:** Yes (OWNER, ADMIN only)
**Query Params:** Same as GET /api/audit
**Response:** CSV file download

---

## 5. REAL-TIME EVENTS (Socket.IO)

### 5.1 Socket Connection

**Client Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

**Server-Side Authentication:**
- Socket.IO middleware validates JWT token
- Joins rooms based on user role:
  - **OWNER/ADMIN:** Joins "overseer" room
  - **MANAGER:** Joins "branch:{branchId}" room
  - **ALL:** Join "branch:{userBranchId}" room

---

### 5.2 Real-time Event Reference

#### Event: `inventory.updated`
**Emitted To:** Branch room, Overseer room
**Triggered By:** Stock adjustment, sale creation, transfer dispatch/receive
**Payload:**
```json
{
  "productId": "prod-123",
  "branchId": "branch-xyz",
  "quantity": 45
}
```

---

#### Event: `lowStock.alert`
**Emitted To:** Branch room, Overseer room
**Triggered By:** Inventory update when quantity <= lowStockThreshold
**Payload:**
```json
{
  "productId": "prod-123",
  "productName": "Brake Pad - Toyota",
  "branchId": "branch-xyz",
  "quantity": 3,
  "threshold": 5
}
```

---

#### Event: `sale.created`
**Emitted To:** Branch room, Overseer room
**Triggered By:** Sale creation
**Payload:** Complete sale object with items

---

#### Event: `payment.recorded`
**Emitted To:** Branch room, Overseer room
**Triggered By:** Credit payment recording
**Payload:** Updated sale object with credit payments

---

#### Event: `sale.reversed`
**Emitted To:** Branch room, Overseer room
**Triggered By:** Sale reversal
**Payload:** Reversed sale object

---

#### Event: `transfer.statusChanged`
**Emitted To:** From branch room, To branch room, Overseer room
**Triggered By:** Transfer request, approval, dispatch, receive, cancel
**Payload:** Complete transfer object

---

## 6. CRITICAL BUSINESS LOGIC

### 6.1 Minimum Price Enforcement

**Rule:** Cannot sell below `product.minPrice` without admin override.

**Enforcement:**
1. Regular sale endpoint (`POST /api/sales`) hard-blocks sales below minPrice
2. Override endpoint (`POST /api/sales/override-price`) allows OWNER/ADMIN to bypass with reason
3. Override reason must be >= 10 characters
4. All overrides are logged in audit trail

**Error Message:**
```
Cannot sell {productName} at KES {unitPrice}. Minimum price is KES {minPrice}. Contact admin for price override.
```

---

### 6.2 Stock Deduction Timing

**CRITICAL:** Stock is ALWAYS deducted immediately when sale is created, regardless of payment method.

**Why?**
- Prevents overselling
- Maintains accurate inventory counts
- Credit sales reserve stock immediately

**Reversal:**
- Sales can be reversed by ADMIN
- Reversal restores inventory
- Creates audit log entry

---

### 6.3 Optimistic Locking (Race Condition Prevention)

**Mechanism:** `version` field on `Inventory` model

**How It Works:**
1. Read inventory record (includes current version)
2. Perform business logic
3. Update inventory with version check:
   ```javascript
   await prisma.inventory.update({
     where: {
       productId_branchId: { productId, branchId },
       version: currentVersion // ⚠️ Must match
     },
     data: {
       quantity: { decrement: quantity },
       version: { increment: 1 } // ⚠️ Increment version
     }
   })
   ```
4. If another process modified inventory in the meantime, Prisma throws `P2034` error
5. Client receives 409 Conflict and must retry

**Error Response (409):**
```json
{
  "message": "Inventory was modified by another process. Please retry."
}
```

---

### 6.4 Transfer Workflow States

**State Machine:**
```
REQUESTED → APPROVED → PACKED → DISPATCHED → RECEIVED
                         ↓
                    CANCELLED
                         ↓
         RECEIVED_WITH_DISCREPANCY
```

**Stock Movement:**
- **DISPATCHED:** Stock deducted from source branch (fromBranchId)
- **RECEIVED:** Stock added to destination branch (toBranchId)
- **Note:** Stock is in transit between DISPATCHED and RECEIVED (not counted in either branch)

---

### 6.5 Credit Sale Workflow

**Status Progression:**
```
PENDING → PARTIAL → PAID
```

**Status Logic:**
- **PENDING:** No payments recorded (totalPaid = 0)
- **PARTIAL:** Some payments recorded (0 < totalPaid < total)
- **PAID:** Fully paid (totalPaid >= total)

**Payment Recording:**
- Cannot overpay (validated server-side)
- Each payment creates a `CreditPayment` record
- Status auto-updates on each payment
- All payments logged in audit trail

---

### 6.6 Caching Strategy

**Redis Cache:**
- Dashboard stats (TTL: 60s)
- Inventory queries (TTL: configurable)

**Cache Invalidation:**
- On inventory changes: `cache.delPattern('inventory:{branchId}:*')`
- On transfers: `cache.delPattern('dashboard:*')`

**Pattern Matching:**
- Uses Redis SCAN to find keys matching pattern
- Deletes all matching keys
- Prevents stale data

---

### 6.7 Audit Trail

**All critical actions are logged:**
- Sales (creation, reversal, price override)
- Inventory changes (stock adjustment, deduction, restoration)
- Transfers (all status changes)
- Credit payments

**Audit Log Fields:**
- `userId` - Who performed the action
- `action` - What was done (e.g., "SALE_CREATED")
- `entityType` - What was affected (e.g., "Sale", "Inventory")
- `entityId` - ID of affected record
- `oldValue` - Previous state (JSON)
- `newValue` - New state (JSON)
- `ipAddress` - Client IP
- `createdAt` - Timestamp

**Retention:** Audit logs are never deleted (for compliance and forensics).

---

## SUMMARY FOR FRONTEND DEVELOPER

### 🔑 Authentication
1. **Login:** POST /api/auth/login → Get token + user object
2. **Store:** Save token in localStorage/sessionStorage
3. **Send:** Include in all requests: `Authorization: Bearer <token>`
4. **User Info:** User object contains `role` and `branchId` (critical for UI logic)

### 🏢 Multi-Branch Filtering
**Source of Truth:** `branchId` in JWT token (set at login)

**Frontend Logic:**
- **MANAGER Users:**
  - UI should show only their branch (hide branch selector)
  - All API calls are auto-filtered server-side
  - DO NOT send `branchId` in query params (server ignores it)

- **OWNER/ADMIN Users:**
  - UI should show branch selector
  - Send selected `branchId` as query param (e.g., `?branchId=xyz`)
  - Can view all branches by omitting `branchId` param

**Implementation Example:**
```javascript
const fetchSales = async (selectedBranchId) => {
  const params = new URLSearchParams();

  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    if (selectedBranchId) params.append('branchId', selectedBranchId);
  }
  // MANAGER users: server auto-filters, no need to send branchId

  const response = await axios.get('/api/sales?' + params, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
```

### 📊 Real-time Updates
1. **Connect:** Establish Socket.IO connection with token
2. **Listen:** Subscribe to events (inventory.updated, lowStock.alert, sale.created, etc.)
3. **Update UI:** Refresh data or show notifications on events

### ⚠️ Error Handling
- **401:** Token expired/invalid → Redirect to login
- **403:** Insufficient permissions → Show error message
- **400:** Validation error → Display specific error message
- **409:** Optimistic locking conflict → Retry operation
- **500:** Server error → Show generic error + contact admin

### 🔒 Role-Based UI
```javascript
const canAccessFeature = (requiredRoles) => {
  return requiredRoles.includes(user.role);
};

// Example usage
{canAccessFeature(['OWNER', 'ADMIN']) && (
  <Button onClick={handlePriceOverride}>Override Price</Button>
)}
```

### 📦 Key API Patterns

**List Endpoints:** Always return paginated data
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Error Responses:** Always include message
```json
{
  "message": "Human-readable error message",
  "error": "Stack trace (development only)"
}
```

**Real-time Events:** Update UI immediately
- Don't wait for polling
- Use Socket.IO events to trigger data refreshes

---

**End of Backend Blueprint**
**For questions, reference this document first.**
**All endpoints are tested and production-ready.**
