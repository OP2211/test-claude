import Image from 'next/image';

const LOGO_SRC = '/logo/fanground-256.png';

interface LogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export default function Logo({ size = 36, animate = false, className }: LogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt=""
      width={256}
      height={256}
      className={className}
      sizes={`${size}px`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        ...(animate ? { animation: 'float 3s ease-in-out infinite' } : {}),
      }}
      aria-hidden
      priority={false}
    />
  );
}
