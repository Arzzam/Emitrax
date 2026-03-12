# EMI Split Feature - Design Document

## Overview

The EMI Split feature allows users to split an EMI's financial responsibility between multiple people. This is useful for joint loans, shared purchases, or any scenario where multiple people are responsible for different portions of the same EMI.

**Key Difference from Sharing:**

- **Sharing**: Grants access/permissions to view/edit an EMI
- **Splitting**: Defines financial responsibility/ownership portions

## Use Cases

1. **Joint Loan**: Two people take a loan together, split 50/50
2. **Unequal Split**: Person A pays 60%, Person B pays 40%
3. **Fractional Split**: Person A pays 1/3, Person B pays 2/3
4. **Multiple People**: Three people split 33.33% each
5. **Amount-based**: Person A pays ₹5000, Person B pays ₹3000 (of ₹8000 EMI)

## Database Design

### Table: `emiSplits`

```sql
CREATE TABLE public."emiSplits" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "emiId" uuid NOT NULL REFERENCES public.emis(id) ON DELETE CASCADE,
    "userId" uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for external participants
    "participantName" text, -- Name for external participants (when userId is null)
    "participantEmail" text, -- Email for external participants (when userId is null)
    "splitPercentage" numeric(5, 2) NOT NULL CHECK ("splitPercentage" > 0 AND "splitPercentage" <= 100),
    "splitAmount" numeric(15, 2), -- Calculated: EMI * splitPercentage / 100
    "isExternal" boolean NOT NULL DEFAULT false, -- True if participant is not a registered user
    "createdBy" uuid NOT NULL REFERENCES auth.users(id),
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    CONSTRAINT emiSplits_unique_user_per_emi UNIQUE ("emiId", "userId") WHERE "userId" IS NOT NULL,
    CONSTRAINT emiSplits_unique_external_per_emi UNIQUE ("emiId", "participantEmail") WHERE "participantEmail" IS NOT NULL,
    CONSTRAINT emiSplits_percentage_valid CHECK ("splitPercentage" > 0 AND "splitPercentage" <= 100),
    CONSTRAINT emiSplits_user_or_external CHECK (
        ("userId" IS NOT NULL AND "isExternal" = false) OR
        ("userId" IS NULL AND "isExternal" = true AND "participantEmail" IS NOT NULL)
    )
);
```

**Key Design Decisions:**

- `userId` is **nullable** - allows external participants
- `participantName` and `participantEmail` - for non-registered users
- `isExternal` flag - clearly identifies external vs registered participants
- **Unique constraints**:
    - One split per registered user per EMI
    - One split per email per EMI (for external participants)
- **Check constraint**: Ensures either userId exists (registered) OR email exists (external)

### Key Features:

- **splitPercentage**: Stores percentage (0-100). Can represent:
    - Percentage: 50% = 50
    - Fraction: 1/3 = 33.33, 2/3 = 66.67
    - Amount: Converted to percentage of total EMI
- **splitAmount**: Calculated field for quick access (EMI \* percentage / 100)
- **Unique Constraint**: One split per user per EMI
- **Validation**: Total splits must sum to 100% (enforced at application level)

### Indexes:

```sql
CREATE INDEX idx_emiSplits_emi_id ON public."emiSplits"("emiId");
CREATE INDEX idx_emiSplits_user_id ON public."emiSplits"("userId");
```

## Data Model

### TypeScript Interfaces

```typescript
export interface IEmiSplit {
    id: string;
    emiId: string;
    userId?: string; // Nullable for external participants
    participantName?: string; // For external participants
    participantEmail?: string; // For external participants
    splitPercentage: number; // 0-100
    splitAmount: number; // Calculated: EMI * splitPercentage / 100
    isExternal: boolean; // True if not a registered user
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    // For registered users
    user_profiles?: {
        email: string;
    };
    // Computed fields
    displayName?: string; // Name to show in UI (user name or participantName)
    displayEmail?: string; // Email to show (user email or participantEmail)
}

// Helper type for creating splits
export interface IEmiSplitInput {
    userId?: string; // For registered users
    participantName?: string; // For external participants
    participantEmail?: string; // For external participants
    splitPercentage: number;
}

// Extend IEmi interface
export interface IEmi {
    // ... existing fields
    splits?: IEmiSplit[]; // Array of splits for this EMI
    mySplit?: IEmiSplit; // Current user's split (if any)
    mySplitAmount?: number; // Current user's portion of EMI
    totalSplitPercentage?: number; // Sum of all splits (should be 100)
    isSplit?: boolean; // Whether this EMI is split
}
```

## Business Logic

### Split Validation Rules

1. **Total Percentage**: Sum of all splits must equal 100% (with small tolerance for rounding: 99.99% - 100.01%)
2. **Minimum Split**: Each split must be > 0% and ≤ 100%
3. **Unique Participants**:
    - Each registered user can only have one split per EMI
    - Each external email can only have one split per EMI
4. **Owner Inclusion**: EMI owner can be included in splits
5. **External Participant Requirements**:
    - Must provide at least email (name is optional)
    - Email must be valid format
    - Cannot be the same as EMI owner's email
6. **Split Calculation**:
    - Monthly EMI split = EMI \* splitPercentage / 100
    - Principal split = Principal \* splitPercentage / 100
    - Interest split = Interest \* splitPercentage / 100
    - GST split = GST \* splitPercentage / 100
7. **External to Registered Conversion**:
    - When external participant registers, can convert their split to use userId
    - Match by email address

### Calculation Examples

**Example 1: 50/50 Split**

- EMI: ₹10,000
- Person A: 50% = ₹5,000
- Person B: 50% = ₹5,000

**Example 2: 1/3 and 2/3 Split**

- EMI: ₹9,000
- Person A: 33.33% = ₹2,999.70
- Person B: 66.67% = ₹6,000.30

**Example 3: Three-way Split**

- EMI: ₹12,000
- Person A: 40% = ₹4,800
- Person B: 35% = ₹4,200
- Person C: 25% = ₹3,000

## Service Layer

### EmiSplitService

```typescript
class EmiSplitService {
    // Create or update splits for an EMI
    // Supports both registered users (userId) and external participants (email/name)
    static async setEmiSplits(emiId: string, splits: Array<IEmiSplitInput>): Promise<void>;

    // Get all splits for an EMI (both registered and external)
    static async getEmiSplits(emiId: string): Promise<IEmiSplit[]>;

    // Get user's split for an EMI (if they're a registered participant)
    static async getUserSplit(emiId: string, userId: string): Promise<IEmiSplit | null>;

    // Get external participant split by email
    static async getExternalSplit(emiId: string, email: string): Promise<IEmiSplit | null>;

    // Remove a split (by userId or email)
    static async removeSplit(emiId: string, userId?: string, email?: string): Promise<void>;

    // Remove all splits for an EMI
    static async removeAllSplits(emiId: string): Promise<void>;

    // Validate splits sum to 100%
    static validateSplits(splits: Array<{ splitPercentage: number }>): boolean;

    // Convert external participant to registered user (when they sign up)
    static async convertExternalToUser(emiId: string, participantEmail: string, userId: string): Promise<void>;

    // Check if external participant has registered (by email)
    static async checkIfExternalRegistered(email: string): Promise<string | null>;
}
```

## UI Components

### 1. SplitEMIModal Component

- Form to add/remove splits
- **Two input modes:**
    - **Registered User**: Search/select from existing users
    - **External Participant**: Enter name and email manually
- Toggle between "App User" and "External Person" modes
- Input for percentage or amount
- Real-time validation
- Visual indicator showing total percentage
- Preview of each person's monthly amount
- **External participant indicators**:
    - Badge showing "External"
    - Option to "Invite to App" (sends email invitation)
- **Conversion**: When external participant registers, show option to link their account

### 2. EMICard Updates

- Show split indicator badge
- Display user's portion: "Your share: ₹5,000 (50%)"
- Show total participants: "Split: 2 people" or "Split: You + 1 external"
- Visual distinction for split EMIs
- Show if external participants exist: "Includes external participants"

### 3. EMIDetails Updates

- Split section showing all participants
- **Two participant types:**
    - **Registered Users**: Show name, email, avatar (if available)
    - **External Participants**: Show name/email, "External" badge, "Invite" button
- Each person's portion breakdown
- Edit/remove split functionality
- **Invite external participants**: Send email invitation to join app
- **Link external to registered**: When external participant signs up, show option to link
- Split history/audit

### 4. Stats/Dashboard Updates

- Filter by "My Splits" vs "Full EMIs"
- Show split amounts in totals
- Calculate user's total EMI responsibility across all splits

## RLS Policies

```sql
-- Users can view splits for EMIs they own or are part of
-- Note: External participants (isExternal = true) are visible to EMI owner only
CREATE POLICY "Users can view their splits"
    ON public."emiSplits"
    FOR SELECT
    USING (
        -- User is a participant (registered user)
        "userId" = auth.uid() OR
        -- User owns the EMI (can see all splits including external)
        EXISTS (
            SELECT 1 FROM public.emis
            WHERE emis.id = "emiSplits"."emiId"
            AND emis."userId" = auth.uid()
        )
    );

-- Only EMI owners can create/update/delete splits
CREATE POLICY "Only owners can manage splits"
    ON public."emiSplits"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.emis
            WHERE emis.id = "emiSplits"."emiId"
            AND emis."userId" = auth.uid()
        )
    );
```

## Implementation Steps

### Phase 1: Database & Types

1. ✅ Create `emiSplits` table schema
2. ✅ Add TypeScript interfaces
3. ✅ Update Supabase types
4. ✅ Create RLS policies

### Phase 2: Service Layer

1. ✅ Create `EmiSplitService`
2. ✅ Implement split CRUD operations
3. ✅ Add validation logic
4. ✅ Update `EmiService.getEmis()` to include splits

### Phase 3: Hooks & State

1. ✅ Create `useEmiSplits()` hook
2. ✅ Create `useSetEmiSplits()` mutation
3. ✅ Create `useRemoveSplit()` mutation

### Phase 4: UI Components

1. ✅ Create `SplitEMIModal` component
2. ✅ Update `EMICard` to show split info
3. ✅ Update `EMIDetails` with split section
4. ✅ Add split management UI

### Phase 5: Calculations & Display

1. ✅ Calculate user's portion amounts
2. ✅ Update stats to include split amounts
3. ✅ Add filters for split vs full EMIs
4. ✅ Update dashboard totals

## Edge Cases & Considerations

1. **Rounding Errors**: Handle cases where splits don't exactly sum to 100% (allow 99.99-100.01%)
2. **EMI Updates**: When EMI amount changes, recalculate split amounts
3. **Split History**: Consider tracking split changes over time
4. **Notifications**:
    - Notify registered users when they're added to a split
    - Optionally send email to external participants (if email service available)
5. **Permissions**: Only EMI owner can manage splits
6. **Deletion**: When EMI is deleted, splits are cascade deleted
7. **User Removal**: When a user is removed from split, redistribute or remove split
8. **External Participant Management**:
    - **Email Validation**: Validate email format for external participants
    - **Duplicate Prevention**: Prevent adding same email twice
    - **Conversion**: When external participant registers, match by email and convert
    - **Privacy**: External participants' info only visible to EMI owner
    - **Invitation**: Optional email invitation to join app (future enhancement)
9. **Data Integrity**:
    - External participants don't have userId (null)
    - Must have participantEmail
    - participantName is optional but recommended
10. **Display Logic**:
    - For registered users: Show name from user_profiles
    - For external: Show participantName or participantEmail
    - Always show email for both types

## Benefits

1. **Financial Clarity**: Each person knows exactly what they owe
2. **Budgeting**: Users can see their portion across all split EMIs
3. **Transparency**: Clear breakdown of who pays what
4. **Flexibility**: Supports any split ratio (50/50, 60/40, 1/3-2/3, etc.)
5. **Integration**: Works seamlessly with existing sharing feature

## Future Enhancements

1. **Split Templates**: Save common split patterns (50/50, 1/3-2/3)
2. **Split History**: Track changes to splits over time
3. **Payment Tracking**: Track who has paid their portion
4. **Notifications**: Alert users about their split amounts
5. **Export**: Export split reports for accounting
6. **Recurring Splits**: Apply same split to multiple EMIs
7. **External Participant Features**:
    - **Email Invitations**: Send invite emails to external participants
    - **View-Only Access**: Allow external participants to view their portion via secure link
    - **Registration Conversion**: Automatic linking when external participant signs up
    - **Reminder Emails**: Send payment reminders to external participants
8. **Bulk Operations**: Add multiple external participants at once
9. **Import/Export**: Import splits from CSV, export for accounting
