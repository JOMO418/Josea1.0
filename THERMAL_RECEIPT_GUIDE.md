# Thermal Receipt Implementation Guide

## Overview

The checkout system now features professional thermal receipt printing optimized for 80mm thermal printers commonly used in retail POS systems.

---

## Implementation Details

### File Structure

1. **`client/src/components/CheckoutModal.tsx`**
   - Hidden receipt div with `id="thermal-receipt"`
   - Conditional rendering based on transaction type
   - Dynamic content population

2. **`client/src/styles/print.css`**
   - Print-specific CSS rules
   - 80mm width formatting
   - Element visibility control

---

## Receipt Layout

### Structure (Top to Bottom)

```
┌─────────────────────────────────┐
│    PRAM AUTO SPARES             │  Business Header
│    Kiserian Branch              │
│    Tel: 0712 345 678            │
├─────────────────────────────────┤
│                                 │
│   OFFICIAL RECEIPT              │  Receipt Type
│   or DEBT INVOICE               │  (conditional)
│   Receipt: RCP1234567890        │
│   22/12/2025, 14:30:45          │
├─────────────────────────────────┤
│   TO BE PAID: KES 500           │  Debt Alert
│   (Only if deni > 0)            │  (black bg, white text)
├─────────────────────────────────┤
│   CUSTOMER DETAILS:             │  Customer Info
│   Name: John Doe                │  (Only if deni > 0)
│   Phone: 0712345678             │
├─────────────────────────────────┤
│   ITEM         QTY     TOTAL    │  Items Table
│   ─────────────────────────────│
│   Brake Pads    2      1200    │
│   Oil Filter    1       350    │
├─────────────────────────────────┤
│   TOTAL DUE:        KES 1550   │  Payment Summary
│   Cash Paid:        KES 1050   │
│   M-Pesa Paid:      KES   0    │
│   Balance (Deni):   KES  500   │
│                                 │
│   CHANGE:           KES   0    │  (if overpayment)
├─────────────────────────────────┤
│  SYSTEM BY JOSEA SOFTWARE       │  Branding Footer
│  SOLUTIONS                      │
│  Thank you for your business!   │
└─────────────────────────────────┘
```

---

## Conditional Logic

### 1. Receipt Type Header

**Logic:**
```javascript
{deni > 0 ? 'DEBT INVOICE' : 'OFFICIAL RECEIPT'}
```

**Output:**
- **Cash/M-Pesa only**: "OFFICIAL RECEIPT"
- **With Deni**: "DEBT INVOICE"

### 2. Debt Alert Banner

**Logic:**
```javascript
{deni > 0 && (
  <div className="bg-black text-white">
    TO BE PAID: KES {deni.toLocaleString()}
  </div>
)}
```

**Appearance:**
- Black background, white text
- Bold font
- Centered
- High contrast for visibility

### 3. Customer Details Box

**Logic:**
```javascript
{deni > 0 && customerName && (
  <div className="border border-black">
    <p>Name: {customerName}</p>
    <p>Phone: {customerPhone}</p>
  </div>
)}
```

**Shows when:**
- Transaction has deni amount > 0
- Customer name is provided

### 4. Payment Breakdown

**Shows conditionally:**
```javascript
{cash > 0 && <div>Cash Paid: KES {cash}</div>}
{mpesa > 0 && <div>M-Pesa Paid: KES {mpesa}</div>}
{deni > 0 && <div>Balance (Deni): KES {deni}</div>}
{successData.change > 0 && <div>CHANGE: KES {change}</div>}
```

---

## Print CSS Strategy

### Critical CSS Rule

```css
@media print {
  /* Hide everything except thermal receipt */
  body > *:not(#thermal-receipt) {
    display: none !important;
  }

  /* Show only thermal receipt */
  #thermal-receipt {
    display: block !important;
    visibility: visible !important;
  }
}
```

**Why this works:**
1. Hides ALL body children except `#thermal-receipt`
2. Modal UI has class `print:hidden` as backup
3. Thermal receipt has class `hidden print:block`
4. Double insurance for clean printing

### Page Format

```css
@page {
  size: 80mm auto;  /* 80mm width, auto height */
  margin: 0;
  padding: 0;
}
```

**Thermal Printer Specs:**
- Width: 80mm (standard)
- Height: Auto-adjusting based on content
- No margins (thermal paper edge-to-edge)

---

## Testing Scenarios

### Test 1: Cash-Only Receipt

**Setup:**
- Cart Total: KES 1,500
- Cash: KES 2,000

**Expected Receipt:**
```
┌─────────────────────────────────┐
│    PRAM AUTO SPARES             │
│    Kiserian Branch              │
├─────────────────────────────────┤
│   OFFICIAL RECEIPT              │
│   Receipt: RCP...               │
├─────────────────────────────────┤
│   [Items table]                 │
├─────────────────────────────────┤
│   TOTAL DUE:        KES 1500   │
│   Cash Paid:        KES 2000   │
│                                 │
│   CHANGE:           KES  500   │
├─────────────────────────────────┤
│  SYSTEM BY JOSEA SOFTWARE       │
│  SOLUTIONS                      │
└─────────────────────────────────┘
```

**Verification:**
- ✅ No debt alert banner
- ✅ No customer details
- ✅ Change amount highlighted
- ✅ Receipt type: "OFFICIAL RECEIPT"

---

### Test 2: Deni (Credit) Receipt

**Setup:**
- Cart Total: KES 1,500
- Cash: KES 1,000
- Deni: KES 500
- Customer: John Doe / 0712345678

**Expected Receipt:**
```
┌─────────────────────────────────┐
│    PRAM AUTO SPARES             │
│    Kiserian Branch              │
├─────────────────────────────────┤
│      DEBT INVOICE               │
│   Receipt: RCP...               │
├═════════════════════════════════┤
│ ▓ TO BE PAID: KES 500 ▓         │  ← Black banner
├─────────────────────────────────┤
│   CUSTOMER DETAILS:             │
│   Name: John Doe                │
│   Phone: 0712345678             │
├─────────────────────────────────┤
│   [Items table]                 │
├─────────────────────────────────┤
│   TOTAL DUE:        KES 1500   │
│   Cash Paid:        KES 1000   │
│   Balance (Deni):   KES  500   │
├─────────────────────────────────┤
│  SYSTEM BY JOSEA SOFTWARE       │
│  SOLUTIONS                      │
└─────────────────────────────────┘
```

**Verification:**
- ✅ Debt alert banner (black bg, white text)
- ✅ Customer details in bordered box
- ✅ Balance (Deni) line present
- ✅ Receipt type: "DEBT INVOICE"
- ✅ No change line (exact payment)

---

### Test 3: Mixed Payment (No Deni)

**Setup:**
- Cart Total: KES 2,000
- Cash: KES 1,200
- M-Pesa: KES 800

**Expected Receipt:**
```
┌─────────────────────────────────┐
│    PRAM AUTO SPARES             │
│    Kiserian Branch              │
├─────────────────────────────────┤
│   OFFICIAL RECEIPT              │
│   Receipt: RCP...               │
├─────────────────────────────────┤
│   [Items table]                 │
├─────────────────────────────────┤
│   TOTAL DUE:        KES 2000   │
│   Cash Paid:        KES 1200   │
│   M-Pesa Paid:      KES  800   │
├─────────────────────────────────┤
│  SYSTEM BY JOSEA SOFTWARE       │
│  SOLUTIONS                      │
└─────────────────────────────────┘
```

**Verification:**
- ✅ Both payment methods shown
- ✅ No debt alert
- ✅ No customer details
- ✅ Exact payment (no change)

---

## Print Testing Steps

### Browser Print Preview

1. **Complete a sale** (any type)
2. **Click "PRINT" button** in success screen
3. **Browser opens print dialog**

**Expected Preview:**
- ✅ Narrow 80mm width receipt visible
- ✅ NO modal UI visible
- ✅ Clean white background
- ✅ All text black (readable)
- ✅ Borders and lines visible

### Common Print Preview Issues

**Issue: Modal UI still visible**
- **Cause**: Print CSS not loading
- **Fix**: Hard refresh (Ctrl+F5) to reload CSS

**Issue: Receipt too wide**
- **Cause**: Page size not set
- **Fix**: Verify `@page { size: 80mm auto; }` in print.css

**Issue: Text too small**
- **Cause**: Font sizes too small for thermal paper
- **Fix**: Adjust font-size in thermal-receipt div

**Issue: Borders not printing**
- **Cause**: Browser default border removal
- **Fix**: Added `border-color: black !important;` in print.css

---

## Physical Printer Setup

### Thermal Printer Requirements

**Compatible Printers:**
- 80mm thermal receipt printers
- ESC/POS compatible
- USB or Network connected

**Popular Models:**
- Epson TM-T20II
- Star TSP143III
- Citizen CT-S310II
- Any 80mm ESC/POS thermal printer

### Browser Print Settings

**Chrome/Edge:**
1. Print dialog → "More settings"
2. Paper size: "Custom" → 80mm x auto
3. Margins: None
4. Scale: 100%
5. Background graphics: ON (for debt alert)

**Firefox:**
1. Print → Properties
2. Paper: Custom 80mm
3. Print Background: ON

---

## API Payload Alignment

### Frontend Sends

```javascript
const payments = [];
const nonCashTotal = mpesa + deni;
const reportedCash = Math.max(0, cartTotal - nonCashTotal);

if (cash > 0) payments.push({ method: 'CASH', amount: reportedCash });
if (mpesa > 0) payments.push({ method: 'MPESA', amount: mpesa });
if (deni > 0) payments.push({ method: 'CREDIT', amount: deni });
```

### Backend Expects

```javascript
{
  items: [{ productId, quantity, unitPrice }],
  payments: [{ method, amount, reference? }],
  customerName: string,
  customerPhone: string | null
}
```

**Payment Sum Validation:**
```javascript
Σ(payments.amount) === sale.total (±0.01 tolerance)
```

**Why reportedCash?**
- Prevents sum validation errors
- Backend receives exact cartTotal match
- Frontend allows change calculation while backend stays accurate

---

## Branding & Legal

### Footer Text

```
SYSTEM BY JOSEA SOFTWARE SOLUTIONS
Thank you for your business!
```

**Location**: Bottom of every receipt

**Font Specs:**
- Size: 9px (uppercase), 8px (thank you)
- Weight: Black (900)
- Tracking: Extra wide (0.3em)

**Border**: Dashed line separator above

---

## Full Reset Logic

### Reset Function

```javascript
const fullReset = () => {
  setCashAmount('');
  setMpesaAmount('');
  setDeniAmount('');
  setCustomerName('');
  setCustomerPhone('');
  setSuccessData(null);
  setError('');
  setShowDeniPopup(false);
};
```

**Triggered by:**
1. "New Sale" button click
2. Modal close (X) button
3. Backdrop click (when not loading)

**Result:**
- Clean slate for next transaction
- No leftover customer data
- No residual payment amounts
- Modal ready for immediate use

---

## Production Checklist

- ✅ Thermal receipt div renders correctly
- ✅ Print CSS hides modal UI
- ✅ 80mm width enforced
- ✅ Debt alert banner visible for deni > 0
- ✅ Customer details show for credit sales
- ✅ Payment breakdown accurate
- ✅ Branding footer present
- ✅ Print preview shows clean receipt
- ✅ Full reset between transactions
- ✅ API payload matches backend expectations

---

## Troubleshooting

### Receipt Not Printing

**Check:**
1. Print CSS loaded? (View source, check `<link>`)
2. `#thermal-receipt` div present in DOM? (Inspect element)
3. Browser print preview shows receipt? (Ctrl+P)

### Wrong Receipt Type

**Check:**
1. `deni` value > 0? (Should show "DEBT INVOICE")
2. `deni` value === 0? (Should show "OFFICIAL RECEIPT")

### Customer Details Missing

**Check:**
1. `deni > 0`? (Customer details only show for credit)
2. `customerName` not empty?
3. `customerPhone` valid?

### Payment Sum Mismatch

**Check:**
1. `reportedCash` calculation correct?
2. `nonCashTotal = mpesa + deni` accurate?
3. Backend validation: `sum === cartTotal ± 0.01`

---

**System Status**: ✅ **THERMAL RECEIPT READY**

The thermal receipt system is fully implemented and ready for production use with 80mm thermal printers.
