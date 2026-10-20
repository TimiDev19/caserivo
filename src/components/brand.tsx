import Image from 'next/image';

export default function Brand({ scheme = 'auto', className = '' }: { scheme?: 'auto' | 'light' | 'dark'; className?: string }) {
  return <span className={`brand-assets brand-scheme-${scheme} ${className}`} aria-label="Caserivo">
    {scheme !== 'dark' && <Image className="brand-image brand-image-light" src="/caserivo-logo-light.png" alt="Caserivo" width={435} height={130} priority/>}
    {scheme !== 'light' && <Image className="brand-image brand-image-dark" src="/caserivo-logo-dark.png" alt="Caserivo" width={420} height={130} priority/>}
  </span>;
}

export function BrandIcon({ scheme = 'auto', className = '' }: { scheme?: 'auto' | 'light' | 'dark'; className?: string }) {
  return <span className={`brand-assets brand-icon-assets brand-scheme-${scheme} ${className}`} aria-hidden="true">
    {scheme !== 'dark' && <Image className="brand-image brand-image-light" src="/caserivo-icon-light.png" alt="" width={118} height={99}/>}
    {scheme !== 'light' && <Image className="brand-image brand-image-dark" src="/caserivo-icon-dark.png" alt="" width={115} height={98}/>}
  </span>;
}
