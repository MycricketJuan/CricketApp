import type { SectorType } from '@cricket/core/types'

export const REGISTRATION_DRAFT_COOKIE = 'cricket_registration_draft'
export const REGISTRATION_DRAFT_MAX_AGE = 60 * 60

const VALID_SECTORS: readonly SectorType[] = [
  'banking',
  'retail',
  'health',
  'telecom',
  'government',
]

export interface RegistrationDraft {
  companyName: string
  slug: string
  sector: SectorType
  createdAt: number
}

export class RegistrationDraftError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegistrationDraftError'
  }
}

export function createRegistrationDraft(formData: FormData): RegistrationDraft {
  const companyName = String(formData.get('companyName') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase()
  const sector = String(formData.get('sector') ?? '').trim() as SectorType

  if (companyName.length < 2 || companyName.length > 120) {
    throw new RegistrationDraftError('El nombre de la empresa debe tener entre 2 y 120 caracteres')
  }
  if (slug.length < 3 || slug.length > 63 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new RegistrationDraftError(
      'El identificador debe tener entre 3 y 63 caracteres y usar letras, números o guiones',
    )
  }
  if (!VALID_SECTORS.includes(sector)) {
    throw new RegistrationDraftError('Selecciona un sector válido')
  }

  return { companyName, slug, sector, createdAt: Date.now() }
}

export function parseRegistrationDraft(value: string | undefined): RegistrationDraft | null {
  if (!value) return null

  try {
    const draft = JSON.parse(value) as Partial<RegistrationDraft>
    const createdAt = draft.createdAt
    const isFresh =
      typeof createdAt === 'number' &&
      Date.now() - createdAt <= REGISTRATION_DRAFT_MAX_AGE * 1000

    if (
      typeof draft.companyName !== 'string' ||
      typeof draft.slug !== 'string' ||
      typeof draft.sector !== 'string' ||
      !isFresh
    ) {
      return null
    }

    const formData = new FormData()
    formData.set('companyName', draft.companyName)
    formData.set('slug', draft.slug)
    formData.set('sector', draft.sector)
    return { ...createRegistrationDraft(formData), createdAt }
  } catch {
    return null
  }
}
