const Skeleton = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse rounded-sm bg-gitlore-border/40 ${className}`} style={style} />
);

export const PageSkeleton = () => (
  <div className="min-h-[calc(100vh-56px)] bg-gitlore-bg p-4 md:p-8">
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  </div>
);

export const AppSkeleton = () => (
  <div className="flex h-[calc(100vh-56px)] bg-gitlore-bg">
    <div className="hidden w-[18%] border-r border-gitlore-border bg-gitlore-surface p-3 md:block">
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="mb-4 h-9 w-full" />
      <Skeleton className="mb-2 h-4 w-16" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="mb-1.5 h-5 w-full" />
      ))}
    </div>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex gap-2 border-b border-gitlore-border bg-gitlore-surface px-4 py-2">
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="flex-1 space-y-1 p-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" style={{ maxWidth: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    </div>
  </div>
);

export const LandingSkeleton = () => (
  <div className="min-h-screen bg-gitlore-bg">
    <div className="flex h-[52px] items-center justify-between border-b border-gitlore-border px-5">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-8 w-28" />
    </div>
    <div className="mx-auto max-w-[1100px] px-6 pt-24">
      <Skeleton className="mx-auto h-3 w-40 md:mx-0" />
      <Skeleton className="mt-6 h-14 w-3/4 md:h-20" />
      <Skeleton className="mt-2 h-14 w-1/2 md:h-20" />
      <Skeleton className="mt-6 h-5 w-full max-w-[520px]" />
      <Skeleton className="mt-1 h-5 w-80" />
      <div className="mt-8 flex gap-3">
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-11 w-40" />
      </div>
    </div>
  </div>
);

export default Skeleton;
