import React from 'react'
import { Button } from '@/components/ui/Button'
import { getTotalPages } from '@/lib/utils'

interface PaginationControlsProps {
  currentPage: number
  recordsCount: number
  recordsPerPage: number
  onPageChange: (page: number) => void
  onPreviousPage: () => void
  onNextPage: () => void
}

const PaginationControlsComponent: React.FC<PaginationControlsProps> = ({
  currentPage,
  recordsCount,
  recordsPerPage,
  onPageChange,
  onPreviousPage,
  onNextPage,
}) => {
  if (recordsCount === 0) return null

  const totalPages = getTotalPages(recordsCount, recordsPerPage)

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="flex items-center text-sm text-gray-700">
        <span>
          Showing {((currentPage - 1) * recordsPerPage) + 1} to{' '}
          {Math.min(currentPage * recordsPerPage, recordsCount)} of{' '}
          {recordsCount} results
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          Previous
        </Button>
        
        {/* Page Numbers */}
        <div className="flex space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              onClick={() => onPageChange(page)}
              variant={currentPage === page ? "primary" : "outline"}
              size="sm"
              className="w-8 h-8 p-0"
            >
              {page}
            </Button>
          ))}
        </div>
        
        <Button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

PaginationControlsComponent.displayName = 'PaginationControls'

export const PaginationControls = React.memo(PaginationControlsComponent)
