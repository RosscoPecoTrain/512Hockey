// Agreements registry — add new agreements here to require users to re-agree
// Bump version to force re-agreement for existing users

export interface Agreement {
  type: string
  version: string
  title: string
  description: string
  href?: string // optional link to full text
}

export const REQUIRED_AGREEMENTS: Agreement[] = [
  {
    type: 'age_tos',
    version: '1.0',
    title: 'Age & Terms of Service',
    description: 'I confirm I am 18 years of age or older and agree to the 512Hockey.com Terms of Service, Privacy Policy, and Community Guidelines.',
    href: '/terms',
  },
]
