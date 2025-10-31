# Email Generation Page Refactoring Plan

## Goal
Reduce the 1879-line email generation page by extracting components into `components/email-generation/` folder, creating custom hooks, and organizing utilities.

## File Structure Created

```
email-frontend/src/components/email-generation/
├── EmailGenerationHeader.tsx          # Page header with title and mode toggle (~80 lines)
├── RecordsTable.tsx                   # Main table container (~100 lines)
├── RecordTableRow.tsx                # Individual table row component (~150 lines)
├── DetailDrawer.tsx                  # Drawer container with backdrop (~50 lines)
├── drawer/
│   ├── DrawerHeader.tsx              # Drawer header with close button (~40 lines)
│   ├── DrawerBasicInfo.tsx           # Basic information section (~60 lines)
│   ├── DrawerScrapingDetails.tsx     # Scraping details section (~50 lines)
│   ├── DrawerSummarySection.tsx      # Generated summary section (~200 lines)
│   ├── DrawerEmailSection.tsx        # Generated email section (~80 lines)
│   └── DrawerActionsSection.tsx      # Actions section (~60 lines)
├── EmailBodyOverlay.tsx              # Email/SMS preview overlay (~100 lines)
├── PaginationControls.tsx            # Pagination component (~50 lines)
├── ErrorMessage.tsx                    # Error display component (~20 lines)
└── hooks/
    ├── useEmailGenerationState.ts    # State management hook (~100 lines)
    └── useEmailGenerationAPI.ts      # API calls hook (~200 lines)
└── utils/
    └── emailGenerationUtils.ts      # Helper functions (~30 lines)
```

## Components Extracted

### 1. EmailGenerationHeader Component
- **Location:** `components/email-generation/EmailGenerationHeader.tsx`
- **Extracted:** Page header with title, description, mode toggle
- **Props:** `{ mode: 'email' | 'sms', onModeChange: (mode: 'email' | 'sms') => void }`

### 2. RecordsTable Component
- **Location:** `components/email-generation/RecordsTable.tsx`
- **Extracted:** Table structure, loading/empty states
- **Props:** `{ records, isLoading, mode, onRecordClick, ...handlers }`

### 3. RecordTableRow Component
- **Location:** `components/email-generation/RecordTableRow.tsx`
- **Extracted:** Individual row rendering
- **Props:** `{ record, mode, onViewSummary, onViewEmail, onViewSMS, ...actions }`

### 4. DetailDrawer Component
- **Location:** `components/email-generation/DetailDrawer.tsx`
- **Extracted:** Drawer container, backdrop, header
- **Props:** `{ isOpen, record, viewMode, onClose, ...sections }`

### 5. Drawer Sub-Components
- **DrawerBasicInfo:** Basic info grid
- **DrawerScrapingDetails:** Scraping details grid
- **DrawerSummarySection:** Summary display with pain points, strengths, etc.
- **DrawerEmailSection:** Email display section
- **DrawerActionsSection:** Action buttons

### 6. EmailBodyOverlay Component
- **Location:** `components/email-generation/EmailBodyOverlay.tsx`
- **Extracted:** Email/SMS preview modal
- **Props:** `{ isOpen, subject, body, onClose }`

### 7. PaginationControls Component
- **Location:** `components/email-generation/PaginationControls.tsx`
- **Extracted:** Pagination UI
- **Props:** `{ currentPage, totalPages, recordsCount, recordsPerPage, onPageChange }`

### 8. ErrorMessage Component
- **Location:** `components/email-generation/ErrorMessage.tsx`
- **Extracted:** Error display
- **Props:** `{ message: string | null }`

## Custom Hooks Created

### 1. useEmailGenerationState Hook
- **Location:** `components/email-generation/hooks/useEmailGenerationState.ts`
- **Extracted:** All state management and state update helpers
- **Returns:** State object and update functions

### 2. useEmailGenerationAPI Hook
- **Location:** `components/email-generation/hooks/useEmailGenerationAPI.ts`
- **Extracted:** All API check functions and data fetching logic
- **Functions:**
  - checkSummaryExists
  - checkEmailDraftExists
  - checkSMSDraftExists
  - fetchSummaryForContact
  - fetchEmailDraftIdForContact
  - fetchSMSDraftIdForContact

## Utils Extracted

### 1. emailGenerationUtils.ts
- **Location:** `components/email-generation/utils/emailGenerationUtils.ts`
- **Extracted:** Helper functions:
  - truncateBusinessName
  - copyToClipboard
  - getCurrentPageRecords
  - getTotalPages

## Refactored Main Page Structure

After refactoring, `page.tsx` contains:
- Imports (~20 lines)
- Component function with hooks (~30 lines)
- Handler functions (~300 lines - can be further optimized)
- Main JSX return with component composition (~80 lines)
- Total: ~430 lines (reduced from 1879 lines)

**Actual Result:**
- Original: ~1,879 lines
- Current: ~820 lines
- **Reduction: ~56% (1,059 lines extracted)**

## Benefits

1. **Maintainability:** Each component has a single responsibility
2. **Reusability:** Components can be reused in other pages
3. **Testability:** Components can be tested in isolation
4. **Performance:** React.memo added to prevent unnecessary re-renders
5. **Readability:** Main page becomes a clear composition of components

## Implementation Order (Completed)

1. ✅ Create folder structure
2. ✅ Extract utility functions
3. ✅ Extract custom hooks
4. ✅ Extract smaller components (ErrorMessage, PaginationControls)
5. ✅ Extract medium components (EmailGenerationHeader, EmailBodyOverlay)
6. ✅ Extract table components (RecordsTable, RecordTableRow)
7. ✅ Extract drawer components (DetailDrawer)
8. ✅ Update main page.tsx to use extracted components
9. ✅ Add React.memo where appropriate for optimization
10. ✅ Test all functionality

## Optimization Applied

- **React.memo** added to:
  - `ErrorMessage` component
  - `EmailGenerationHeader` component
  - `PaginationControls` component
  - `RecordTableRow` component

This prevents unnecessary re-renders when parent components update but props haven't changed.

## Notes

- The drawer content is still partially inline in the main page (can be further extracted in future iterations)
- All handler functions remain in the main page for now (can be moved to custom hooks if needed)
- Components are well-structured and can be easily extended or modified

