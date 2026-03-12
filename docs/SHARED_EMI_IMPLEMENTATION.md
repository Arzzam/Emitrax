# Shared EMI Feature Implementation

## Overview

This document describes the implementation of the shared EMI feature, which allows users to share their EMIs with other users with either read-only or read-write permissions.

## Architecture

### Database Schema

The feature introduces a new `emi_shares` table that acts as a junction table between `emis` and `auth.users`:

- **emi_shares**: Stores sharing relationships
    - `id`: UUID primary key
    - `emiId`: Foreign key to `emis` table
    - `sharedWithUserId`: Foreign key to `auth.users` (the user receiving the share)
    - `permission`: Either 'read' or 'write'
    - `createdBy`: The user who created the share (usually the EMI owner)
    - `createdAt`: Timestamp

### Row Level Security (RLS)

Comprehensive RLS policies ensure:

1. Users can only view shares they're involved in (as recipient, creator, or EMI owner)
2. Only EMI owners can create, update, or delete shares
3. Users can view EMIs they own or that are shared with them
4. Users can update EMIs they own or that are shared with write permission
5. Only owners can delete EMIs

## Implementation Details

### Type System

- **IEmiShare**: Interface for share records
- **IEmi**: Extended with:
    - `isOwner`: Boolean indicating if current user owns the EMI
    - `permission`: 'read' | 'write' | undefined
    - `sharedWith`: Array of IEmiShare objects (only populated for owned EMIs)

### Services

#### EmiShareService

Methods for managing shares:

- `shareEmi(emiId, email, permission)`: Share by email (requires profiles table or RPC)
- `shareEmiByUserId(emiId, userId, permission)`: Share by user ID
- `unshareEmi(emiId, sharedWithUserId)`: Remove a share
- `updateSharePermission(emiId, sharedWithUserId, permission)`: Update permission level
- `getEmiShares(emiId)`: Get all shares for an EMI
- `canEditEmi(emiId, userId)`: Check if user can edit an EMI

#### EmiService Updates

- `getEmis()`: Now includes:
    - Owned EMIs with their shares
    - Shared EMIs with permission information
- `updateEmi()`: Checks write permission before allowing updates
- `deleteEmi()`: Only allows deletion by owner
- `archiveEmi()` / `unarchiveEmi()`: Only allows by owner

### React Hooks

New hooks in `useEmi.ts`:

- `useShareEmi()`: Mutation for sharing by email
- `useShareEmiByUserId()`: Mutation for sharing by user ID
- `useUnshareEmi()`: Mutation for removing shares
- `useUpdateSharePermission()`: Mutation for updating permissions
- `useEmiShares(emiId)`: Query for fetching shares of an EMI

### UI Components

#### ShareEMIModal

A comprehensive modal component (`src/components/emi/ShareEMIModal.tsx`) that provides:

- Form to share EMI by email with permission selection
- List of current shares with ability to:
    - Change permission levels
    - Remove shares
- Visual indicators for permission levels (read/write badges)

#### EMICard Updates

- Shows shared indicator badge when EMI is shared
- Shows "Shared" badge for EMIs shared with the current user
- Visual distinction for shared EMIs (blue border/background)

#### EMIDetails Updates

- Share button (only visible to owners)
- Permission-based UI:
    - Edit button only shown if user has write permission
    - Archive/Delete buttons only shown to owners
    - Badge showing permission level for shared EMIs

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# Copy the contents of supabase_migrations.sql and run in Supabase Dashboard > SQL Editor
```

This will:

- Create the `emi_shares` table
- Set up RLS policies
- Create optional `profiles` table for email lookup
- Create RPC function for email-to-user-ID lookup

### 2. User Lookup Options

You have three options for sharing by email:

**Option A: Profiles Table (Recommended)**

- The migration creates a `profiles` table
- Automatically populated via trigger when users sign up
- `EmiShareService.shareEmi()` will use this table

**Option B: RPC Function**

- The migration creates `get_user_id_by_email()` function
- Uses Supabase's auth.users table
- `EmiShareService.shareEmi()` will fall back to this

**Option C: User ID Directly**

- Use `EmiShareService.shareEmiByUserId()` directly
- Requires you to have the user ID beforehand

### 3. Verify RLS Policies

After running the migration, verify that:

1. Users can only see their own EMIs and EMIs shared with them
2. Users can only edit EMIs they own or have write permission for
3. Only owners can delete/archive EMIs
4. Only owners can manage shares

## Usage

### Sharing an EMI

1. Navigate to EMI Details page
2. Click "Share" button (only visible to owners)
3. Enter email address of the user to share with
4. Select permission level (Read or Write)
5. Click "Share EMI"

### Managing Shares

- View all shares in the ShareEMIModal
- Change permission levels using the dropdown
- Remove shares using the trash icon

### Using Shared EMIs

- Shared EMIs appear in the main EMI list
- Visual indicators show:
    - "Shared" badge for EMIs shared with you
    - Permission level (read/write)
- Edit functionality is disabled for read-only shares
- Archive/Delete are only available to owners

## Security Considerations

1. **RLS Enforcement**: All database operations are protected by RLS policies
2. **Permission Checks**: Service layer validates permissions before operations
3. **Owner-Only Operations**: Critical operations (delete, archive, share management) restricted to owners
4. **Cascade Deletes**: Shares are automatically deleted when EMI is deleted
5. **User Validation**: Sharing validates user existence before creating shares

## Future Enhancements

Potential improvements:

1. Email notifications when EMI is shared
2. Share invitation system with pending/accept/decline flow
3. Bulk sharing operations
4. Share history/audit log
5. Share expiration dates
6. More granular permissions (e.g., view-only specific fields)

## Troubleshooting

### "User not found" error when sharing

- Ensure the user has signed up and has an account
- If using profiles table, verify it's being populated via trigger
- If using RPC, verify the function exists and has proper permissions
- Consider using `shareEmiByUserId()` if you have the user ID

### Shared EMIs not appearing

- Verify RLS policies are correctly applied
- Check that `emi_shares` table has proper foreign key constraints
- Ensure user is authenticated

### Permission denied errors

- Verify RLS policies allow the operation
- Check that user has the required permission level
- Ensure `isOwner` and `permission` fields are correctly populated

## Notes

- The implementation follows your strict requirements for security, data integrity, and clean architecture
- All code is strongly typed with TypeScript
- Error handling is comprehensive with user-friendly messages
- UI follows the medical-grade, professional design guidelines
- Performance is optimized with proper indexing and efficient queries
