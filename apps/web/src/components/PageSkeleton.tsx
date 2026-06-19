import syndecareLogo from "@/assets/syndeocare-mark.png";

const PageSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <img
        src={syndecareLogo}
        alt="SyndeoCare"
        width={48}
        height={48}
        className="animate-pulse"
      />
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
};

export default PageSkeleton;
