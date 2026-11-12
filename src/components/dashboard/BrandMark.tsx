import Image from "next/image";
import Link from "next/link";

export function BrandMark({ hero = false }: { hero?: boolean }) {
  return (
    <Link href="/" aria-label="Way2Investing home" className={`brand-mark ${hero ? "brand-mark-hero" : ""}`}>
      <Image
        src="/brand/way2investing-logo-filled-white.png"
        alt="Way2Investing"
        width={1603}
        height={460}
        priority
        className="h-auto w-full object-contain"
      />
    </Link>
  );
}
