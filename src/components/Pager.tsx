interface PagerProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pager({ page, totalPages, onChange }: PagerProps) {
  if (totalPages <= 1) return null

  return (
    <div className="pager">
      <button type="button" className="pill" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="pill"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
