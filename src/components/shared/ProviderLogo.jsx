import credoLogo from '@/assets/provider-logos/credo.png';
import gryphonLogo from '@/assets/provider-logos/gryphon.png';
import juliusBaerLogo from '@/assets/provider-logos/julius-baer.png';
import northstarLogo from '@/assets/provider-logos/northstar.png';
import prescientLogo from '@/assets/provider-logos/prescient.png';
import primeLogo from '@/assets/provider-logos/prime-investments.png';

export const providerBranding = {
  'julius-baer': { name: 'Julius Baer', logo: juliusBaerLogo, accent: '#172158' },
  credo: { name: 'Credo', logo: credoLogo, accent: '#00A9E0' },
  gryphon: { name: 'Gryphon', logo: gryphonLogo, accent: '#6E4CB8' },
  prime: { name: 'Prime Investments', logo: primeLogo, accent: '#B51F2F' },
  'prime-investments': { name: 'Prime Investments', logo: primeLogo, accent: '#B51F2F' },
  'northstar-fnb': { name: 'Northstar FNB', logo: northstarLogo, accent: '#176B87' },
  'northstar-sanlam': { name: 'Northstar Sanlam', logo: northstarLogo, accent: '#176B87' },
  northstar: { name: 'Northstar', logo: northstarLogo, accent: '#176B87' },
  peresec: { name: 'Peresec', accent: '#5B5F68' },
  prescient: { name: 'Prescient', logo: prescientLogo, accent: '#244C37' },
};

export function providerKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = {
    'julius baer': 'julius-baer',
    'julius bär': 'julius-baer',
    credo: 'credo',
    gryphon: 'gryphon',
    'gryphon asset management': 'gryphon',
    prime: 'prime',
    'prime investments': 'prime',
    'northstar fnb': 'northstar-fnb',
    'northstar sanlam': 'northstar-sanlam',
    northstar: 'northstar',
    peresec: 'peresec',
    'peresec securities': 'peresec',
    prescient: 'prescient',
  };
  return aliases[normalized] || normalized.replace(/\s+/g, '-');
}

export default function ProviderLogo({
  provider,
  providerId,
  showName = true,
  logoClassName = 'max-h-8 max-w-[112px]',
  logoBoxClassName = 'h-11 w-32',
  className = '',
}) {
  const id = providerId || providerKey(provider);
  const brand = providerBranding[id] || { name: provider || id, accent: '#5B5F68' };
  const label = provider || brand.name;

  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      {brand.logo ? (
        <span className={`flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-white px-3 ${logoBoxClassName}`}>
          <img src={brand.logo} alt={`${brand.name} logo`} className={`${logoClassName} object-contain`} />
        </span>
      ) : (
        <span className={`flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-white px-3 ${logoBoxClassName}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ backgroundColor: brand.accent }}>
            {label?.[0] || '?'}
          </span>
        </span>
      )}
      {showName && <span className="truncate font-semibold text-foreground">{label}</span>}
    </span>
  );
}
