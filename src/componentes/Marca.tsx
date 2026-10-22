// Marca do produto: IO TECNOLOGIA e, embaixo, o cliente (Fênix).
export function Logo({ tam = 34 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 64 64" aria-hidden="true" className="logo-svg">
      <rect width="64" height="64" rx="16" fill="#DEE8F4" />
      <rect x="14" y="18" width="7" height="28" rx="3.5" fill="#0C3257" />
      <circle cx="39" cy="32" r="11.5" fill="none" stroke="#0C3257" strokeWidth="6.5" />
    </svg>
  );
}

export function Marca() {
  return (
    <div className="marca">
      <Logo />
      <div><b>IO TECNOLOGIA</b><small>Fênix</small></div>
    </div>
  );
}
