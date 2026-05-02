// Hand-rolled stroke icons. Single source of truth so we don't depend on
// an icon package — keeps bundle tiny and visual style consistent.

export function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M13.5 11.2v2a1.3 1.3 0 0 1-1.4 1.3 13 13 0 0 1-5.7-2 12.8 12.8 0 0 1-4-4 13 13 0 0 1-2-5.7A1.3 1.3 0 0 1 1.7 1.5h2a1.3 1.3 0 0 1 1.4 1.1c.1.7.2 1.4.5 2a1.3 1.3 0 0 1-.3 1.4l-.9.9a10.7 10.7 0 0 0 4 4l.9-.9a1.3 1.3 0 0 1 1.4-.3c.6.3 1.3.4 2 .5a1.3 1.3 0 0 1 1.1 1.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 4.5 8 8.5l5.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 14l1.2-3.3A6 6 0 1 1 5.4 13l-3.4 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6.5s.4-.7.8-.7c.3 0 .5.1.7.5l.4.8c.1.3 0 .5-.2.7l-.3.2a4 4 0 0 0 1.6 1.6l.2-.3c.2-.2.4-.3.7-.2l.8.4c.4.2.5.4.5.7 0 .4-.7.8-.7.8-.4.3-.9.3-1.4.1a7 7 0 0 1-3.2-3.2c-.2-.5-.2-1 .1-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArrowIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6h8M6.5 2.5 10 6 6.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
