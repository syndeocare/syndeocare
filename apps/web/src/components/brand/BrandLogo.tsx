import { SITE_CONFIG } from "@/config/constants";
import { cn } from "@/lib/utils";
import brandMark from "@/assets/syndeocare-mark.png";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  showName?: boolean;
  inverted?: boolean;
}

const BrandLogo = ({
  className,
  iconClassName,
  nameClassName,
  showName = true,
  inverted = false,
}: BrandLogoProps) => {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={brandMark}
        alt={SITE_CONFIG.name}
        className={cn("h-10 w-10 object-contain", iconClassName)}
      />
      {showName ? (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            inverted ? "text-white" : "text-foreground",
            nameClassName,
          )}
        >
          {SITE_CONFIG.name}
        </span>
      ) : null}
    </span>
  );
};

export default BrandLogo;
