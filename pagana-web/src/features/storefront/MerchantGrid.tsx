import { useMerchants } from '@/api/catalog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MerchantCard } from './MerchantCard';

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[16/9] w-full rounded-lg" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function MerchantGrid() {
  const { data, isPending, isError, refetch } = useMerchants();

  if (isPending) {
    return <GridSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">
          We couldn&apos;t load restaurants right now.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No restaurants are open right now. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.results.map((merchant) => (
        <MerchantCard key={merchant.id} merchant={merchant} />
      ))}
    </div>
  );
}
