# Vendor Payout Management - ChawpAdmin

## Overview

The Vendor Payout Management system allows administrators to view vendor payment details, verify bank information, and process payouts directly from the Users Management page.

## Features

### 1. Bank Details Viewing

- **Payment Method Display**: Shows whether vendor uses bank account or mobile money
- **Bank Account Details**: Account name, account number, bank name, routing number
- **Mobile Money Details**: Provider (MTN, Vodafone, AirtelTigo), phone number, account name
- **Verification Status**: Visual indicator showing if payment details are verified

### 2. Bank Details Verification

- **One-Click Verification**: Admins can verify/unverify payment details with a single button
- **Verification Timestamp**: System records when details were verified
- **Visual Feedback**: Clear badges and colors indicate verification status
  - ✅ Green checkmark for verified
  - ⚠️ Orange alert for unverified

### 3. Payout Management

- **View Payout History**: Complete list of all payouts for a vendor
- **Payout Details**: Amount, status, payment method, reference number, notes, dates
- **Status Tracking**: pending → processing → completed
- **Status Badges**: Color-coded badges for quick status identification
  - 🟡 Yellow for pending
  - 🔵 Blue for processing
  - 🟢 Green for completed
  - 🔴 Red for failed
  - ⚪ Gray for cancelled

### 4. Create New Payouts

- **Prerequisites**: Vendor must have verified bank details
- **Payout Form**:
  - Amount input (GH₵)
  - Automatic payment method detection from bank details
  - Optional notes field
- **Validation**: Ensures amount is positive before creation
- **Automatic Refresh**: Payout list updates immediately after creation

### 5. Update Payout Status

- **Pending Payouts**: Can be marked as "processing" or "completed"
- **Processing Payouts**: Can be marked as "completed"
- **Status Actions**: Quick action buttons on each payout card
- **Real-Time Updates**: UI updates immediately without page refresh

## User Interface

### Users Management Page

When viewing a user with `role='vendor'`, the following sections appear after basic user details:

#### Bank Details Section

```
Bank Details
┌─────────────────────────────────────┐
│ Payment Method: Mobile Money        │
│ Provider: MTN                        │
│ Name: John Doe                       │
│ Number: 0244123456                   │
│ ┌─────────┐                          │
│ │ ✅ Verified │    [Unverify Button] │
│ └─────────┘                          │
│ Verified on: 2024-01-15 10:30 AM    │
└─────────────────────────────────────┘
```

#### Payout History Section

```
Payout History (3)              [+ Create Payout]
┌─────────────────────────────────────┐
│ GH₵500.00                 [pending] │
│ bank_transfer              1/15/2024│
│ Processing vendor payment            │
│ [Processing] [Complete]              │
└─────────────────────────────────────┘
```

### Create Payout Modal

```
Create Payout
┌─────────────────────────────────────┐
│ Payout Amount (GH₵)                 │
│ [Enter amount            ]          │
│                                      │
│ Payment Method                       │
│ 📱 Mobile Money (MTN)               │
│                                      │
│ Notes (Optional)                     │
│ [Add notes about this payout...]    │
│                                      │
│                                      │
│ [Cancel]        [Create Payout]     │
└─────────────────────────────────────┘
```

## Technical Implementation

### API Functions (adminApi.js)

#### fetchUserVendorBankDetails(userId)

Retrieves bank details for a user by linking user → vendor → bank_details

```javascript
const result = await fetchUserVendorBankDetails(userId);
// Returns: { success: true, data: bankDetails, vendorId: "..." }
// Returns: { success: true, data: null, message: "User is not a vendor" }
```

#### verifyVendorBankDetails(bankDetailsId, isVerified)

Updates verification status and timestamp

```javascript
await verifyVendorBankDetails(bankDetailsId, true);
// Sets is_verified = true, verified_at = NOW()
await verifyVendorBankDetails(bankDetailsId, false);
// Sets is_verified = false, verified_at = NULL
```

#### fetchVendorPayouts(vendorId)

Gets all payouts for a vendor, ordered by creation date (newest first)

```javascript
const result = await fetchVendorPayouts(vendorId);
// Returns: { success: true, data: [...payouts] }
```

#### createVendorPayout(payoutData)

Creates a new payout record

```javascript
const payoutData = {
  vendorId: "uuid",
  amount: 500.0,
  status: "pending",
  paymentMethod: "mobile_money",
  notes: "Weekly payout",
};
const result = await createVendorPayout(payoutData);
// Returns: { success: true, data: newPayout }
```

#### updatePayoutStatus(payoutId, status, referenceNumber)

Updates payout status and optionally sets reference number

```javascript
await updatePayoutStatus(payoutId, "completed", "TXN123456");
// Sets status = "completed", completed_at = NOW(), reference_number = "TXN123456"
```

### State Management

```javascript
// Bank details state
const [bankDetails, setBankDetails] = useState(null);
const [loadingBankDetails, setLoadingBankDetails] = useState(false);
const [verifyingBank, setVerifyingBank] = useState(false);

// Payouts state
const [payouts, setPayouts] = useState([]);
const [loadingPayouts, setLoadingPayouts] = useState(false);
const [vendorId, setVendorId] = useState(null);

// Payout modal state
const [payoutModalVisible, setPayoutModalVisible] = useState(false);
const [payoutAmount, setPayoutAmount] = useState("");
const [payoutNotes, setPayoutNotes] = useState("");
const [creatingPayout, setCreatingPayout] = useState(false);
```

### Data Flow

```
User Views Vendor
       ↓
loadVendorFinancialData(userId)
       ↓
fetchUserVendorBankDetails(userId)
       ↓
setBankDetails(data)
setVendorId(vendorId)
       ↓
fetchVendorPayouts(vendorId)
       ↓
setPayouts(data)
       ↓
Render Bank Details & Payout History
```

### Verification Flow

```
Admin Clicks Verify Button
       ↓
handleVerifyBankDetails()
       ↓
verifyVendorBankDetails(bankDetailsId, !isVerified)
       ↓
Update local state
       ↓
Show success notification
```

### Payout Creation Flow

```
Admin Clicks "Create Payout"
       ↓
Open payoutModal
       ↓
Admin Enters Amount & Notes
       ↓
Admin Clicks "Create Payout"
       ↓
handleCreatePayout()
       ↓
createVendorPayout(payoutData)
       ↓
fetchVendorPayouts(vendorId) [refresh list]
       ↓
Close modal & show success notification
```

## Database Schema

### chawp_vendor_bank_details

```sql
CREATE TABLE chawp_vendor_bank_details (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES chawp_vendors,
  payment_method VARCHAR(50), -- 'bank' or 'mobile_money'

  -- Bank fields
  account_name VARCHAR(255),
  account_number VARCHAR(50),
  bank_name VARCHAR(255),
  routing_number VARCHAR(50),

  -- Mobile money fields
  mobile_money_provider VARCHAR(50), -- 'mtn', 'vodafone', 'airteltigo'
  mobile_money_number VARCHAR(20),
  mobile_money_name VARCHAR(255),

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### chawp_vendor_payouts

```sql
CREATE TABLE chawp_vendor_payouts (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES chawp_vendors,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  payment_method VARCHAR(50), -- bank_transfer, mobile_money, etc.
  reference_number VARCHAR(100),
  notes TEXT,
  processed_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

## Row Level Security (RLS)

### Vendors can view their own data

```sql
CREATE POLICY "Vendors can view own payouts"
ON chawp_vendor_payouts FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM chawp_vendors WHERE id = vendor_id
));
```

### Admins have full access

```sql
CREATE POLICY "Admins can view all payouts"
ON chawp_vendor_payouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chawp_user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Admins can create payouts"
ON chawp_vendor_payouts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chawp_user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);
```

## Security Considerations

### 1. Role-Based Access

- Only admins and super_admins can verify bank details
- Only admins and super_admins can create/update payouts
- Vendors can only view their own payout history

### 2. Data Validation

- Amount must be positive
- Status transitions must be valid (pending → processing → completed)
- Vendor must have verified bank details before creating payouts

### 3. Audit Trail

- All verifications include timestamp
- All payouts include creation timestamp
- Completed payouts include completion timestamp
- Optional processed_by field tracks which admin processed payout

### 4. Sensitive Data

- Bank account numbers visible to admins only
- Mobile money numbers visible to admins only
- RLS policies prevent unauthorized access

## Usage Guidelines

### For Admins

#### Before Processing Payouts:

1. ✅ Verify vendor has submitted bank details
2. ✅ Review payment method and account information
3. ✅ Click "Verify" button to mark details as verified
4. ✅ Only then will "Create Payout" button appear

#### When Creating Payouts:

1. Click "Create Payout" button
2. Enter payout amount in GH₵
3. Verify correct payment method is displayed
4. Add notes (e.g., "Weekly payout", "Commission for January")
5. Click "Create Payout"
6. Payout will be created with status "pending"

#### When Processing Payouts:

1. Review pending payouts in history
2. Process payment through bank/mobile money system
3. Click "Processing" when payment is being processed
4. Get transaction reference number from payment system
5. Click "Complete" to mark as completed
6. Status will change to "completed" with timestamp

### For Developers

#### Adding New Payment Methods:

1. Update `chawp_vendor_bank_details` table schema
2. Add new provider to `payment_method` enum or add new fields
3. Update ProfilePage.js in ChawpVendor to add form fields
4. Update UsersManagementPage.js display logic
5. Update createVendorPayout to handle new payment method

#### Extending Payout Functionality:

- Add bulk payout creation for multiple vendors
- Add payout scheduling (recurring payouts)
- Add payout approval workflow (request → approve → process)
- Add email notifications for payout status changes
- Add payout reports and analytics
- Add export to CSV/Excel for accounting

## Troubleshooting

### Bank Details Not Showing

- ✅ Verify user has `role='vendor'`
- ✅ Check vendor record exists in `chawp_vendors` table
- ✅ Verify `vendor_id` matches user's vendor profile
- ✅ Check console for API errors

### "Create Payout" Button Disabled

- ✅ Verify bank details are marked as verified
- ✅ Check `is_verified` field in database
- ✅ Ensure admin has clicked "Verify" button

### Payout Not Created

- ✅ Verify amount is positive number
- ✅ Check `chawp_vendor_payouts` table exists
- ✅ Verify admin has proper permissions (RLS policies)
- ✅ Check console for API errors

### Status Update Failed

- ✅ Verify payout exists in database
- ✅ Check RLS policies allow admin to update
- ✅ Ensure status transition is valid
- ✅ Check console for API errors

## Future Enhancements

### Short Term

- [ ] Add reference number field when marking as completed
- [ ] Add confirmation dialog for status updates
- [ ] Add search/filter for payout history
- [ ] Add date range filter for payouts
- [ ] Add total payout calculations

### Medium Term

- [ ] Add bulk payout processing
- [ ] Add payout approval workflow
- [ ] Add email notifications to vendors
- [ ] Add payout receipt generation (PDF)
- [ ] Add payout analytics dashboard

### Long Term

- [ ] Add automatic payout scheduling
- [ ] Add integration with payment gateways
- [ ] Add payout reconciliation tools
- [ ] Add multi-currency support
- [ ] Add payout forecasting

## Related Documentation

- [Vendor Bank Details Setup (ChawpVendor)](../../ChawpVendor/docs/BANK_DETAILS_SETUP.md)
- [Authentication Persistence](../../ChawpVendor/docs/AUTHENTICATION_PERSISTENCE.md)
- [Admin API Reference](./ADMIN_API.md)
- [Database Migration Guide](../migrations/README.md)

## Support

For issues or questions, contact the development team or refer to the troubleshooting section above.
