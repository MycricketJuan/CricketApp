// Constantes compartidas del módulo de trámites.
// Sin 'use client' ni 'use server': importable desde Server
// Components, Client Components y Server Actions por igual.

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Radicado',
  in_review: 'En revisión',
  pending_docs: 'Docs pendientes',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  pending_docs: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

// Transiciones de estado permitidas. Se renderizan en el panel de
// gestión y se validan de nuevo en el Server Action.
export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['in_review', 'cancelled'],
  in_review: ['approved', 'rejected', 'pending_docs'],
  pending_docs: ['in_review', 'cancelled'],
  approved: ['completed'],
  rejected: ['completed'],
  completed: [],
  cancelled: [],
}

export const RESOLVED_STATUSES = ['completed', 'approved', 'rejected', 'cancelled']
