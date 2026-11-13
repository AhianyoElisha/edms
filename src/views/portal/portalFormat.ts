export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

// The words a customer sees for our internal statuses
const TRIP_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  awaiting_manifests: { label: 'Being prepared', color: 'default' },
  planned: { label: 'Planned', color: 'info' },
  in_progress: { label: 'On the road', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' }
}

const MANIFEST_STATUS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pending', color: 'default' },
  loaded: { label: 'Loaded', color: 'info' },
  in_transit: { label: 'On the road', color: 'warning' },
  delivered: { label: 'Delivered', color: 'success' },
  completed: { label: 'Delivered', color: 'success' }
}

const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export const tripStatus = (status: string) => TRIP_STATUS[status] || { label: titleCase(status || 'Unknown'), color: 'default' as const }
export const manifestStatus = (status: string) =>
  MANIFEST_STATUS[status] || { label: titleCase(status || 'Unknown'), color: 'default' as const }
