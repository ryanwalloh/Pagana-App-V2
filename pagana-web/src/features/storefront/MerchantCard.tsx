import { Link } from 'react-router-dom';
import { MapPin, Store } from 'lucide-react';

import type { MerchantSummary } from '@/api/catalog';
import { Card, CardContent } from '@/components/ui/card';

export function MerchantCard({ merchant }: { merchant: MerchantSummary }) {
  return (
    <Link
      to={`/merchants/${merchant.id}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
    >
      <Card className="overflow-hidden border-border transition-shadow group-hover:shadow-md h-full">
        <div className="aspect-[16/9] bg-muted flex items-center justify-center overflow-hidden">
          {merchant.storefront_image_url ? (
            <img
              src={merchant.storefront_image_url}
              alt={merchant.display_name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <Store className="h-10 w-10 text-muted-foreground/50" aria-hidden />
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground truncate">{merchant.display_name}</h3>
          {merchant.city && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {merchant.city}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
