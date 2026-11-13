import type { AnchorHTMLAttributes } from 'react'

type StaticLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

// Full-document navigation avoids failed RSC payload fetches in the static-export preview.
export default function StaticLink({ href, ...props }: StaticLinkProps) {
  return <a href={href} {...props} />
}
