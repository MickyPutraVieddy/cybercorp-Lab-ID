'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/src/store/store-provider'

export function NewsletterSignup() {
  const { t } = useStore()
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="newsletter" aria-labelledby="newsletter-title">
      <div>
        <span className="eyebrow">{t('lettersEyebrow')}</span>
        <h2 id="newsletter-title">{t('newsletter')}</h2>
        <p>{t('newsletterText')}</p>
      </div>
      <div>
        {submitted ? <p className="success-message" role="status">{t('newsletterSuccess')}</p> : (
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="newsletter-email">{t('emailAddress')}</label>
            <input id="newsletter-email" type="email" autoComplete="email" placeholder="you@example.com" required />
            <Button type="submit" className="store-button min-h-11 rounded-full px-5">
              <span className="btn-label">{t('subscribe')}</span><ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
