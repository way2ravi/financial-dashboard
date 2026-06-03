import Image from "next/image";

export function BrandMark() {
  return (
    <div className="flex shrink-0 items-center">
      <Image
        src="/brand/way2investing-logo-filled-white.png"
        alt="Way2Investing"
        width={1603}
        height={460}
        priority
        className="h-auto w-[180px] object-contain object-left drop-shadow-md sm:w-[220px] lg:w-[250px] xl:w-[280px]"
      />
    </div>
  );
}
