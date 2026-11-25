import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading workspace">
      <div className="bento-cell flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-[16px]" />
        <Skeleton className="h-32 rounded-[16px]" />
        <Skeleton className="h-32 rounded-[16px]" />
        <Skeleton className="h-32 rounded-[16px]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-[340px] rounded-[16px] lg:col-span-8" />
        <Skeleton className="h-[340px] rounded-[16px] lg:col-span-4" />
      </div>
    </div>
  );
}
