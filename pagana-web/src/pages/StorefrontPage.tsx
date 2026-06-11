import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Store } from 'lucide-react';

import {
  useMerchant,
  useMerchantCatalog,
  type Product,
} from '@/api/catalog';
import { AddToCartControl } from '@/features/cart/AddToCartControl';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="text-left w-full focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
    >
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="p-4 flex gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{product.display_name}</h3>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            )}
            <p className="mt-2 font-medium text-brand">{formatPrice(product.price)}</p>
          </div>
          {product.image_url && (
            <img
              src={product.image_url}
              alt=""
              className="h-20 w-20 rounded-md object-cover shrink-0"
              loading="lazy"
            />
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function ProductDetailDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {product && (
          <>
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.display_name}
                className="w-full aspect-[16/9] rounded-md object-cover"
              />
            )}
            <DialogHeader>
              <DialogTitle>{product.display_name}</DialogTitle>
              {product.description && (
                <DialogDescription>{product.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-3">
              <span className="text-lg font-semibold text-brand">
                {formatPrice(product.price)}
              </span>
              <AddToCartControl product={product} onAdded={onClose} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StorefrontSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  const params = useParams();
  const merchantId = Number(params.merchantId);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const merchantQuery = useMerchant(merchantId);
  const catalogQuery = useMerchantCatalog(merchantId);

  const productsByCategory = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of catalogQuery.data?.results ?? []) {
      const key = product.category?.name ?? 'Menu';
      const group = groups.get(key) ?? [];
      group.push(product);
      groups.set(key, group);
    }
    return groups;
  }, [catalogQuery.data]);

  if (merchantQuery.isPending || catalogQuery.isPending) {
    return <StorefrontSkeleton />;
  }

  if (merchantQuery.isError) {
    const status = (merchantQuery.error as { response?: { status?: number } })?.response
      ?.status;
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <Store className="h-12 w-12 mx-auto text-muted-foreground/50" aria-hidden />
        <h1 className="text-2xl font-semibold">
          {status === 404 ? 'Restaurant not available' : 'Something went wrong'}
        </h1>
        <p className="text-muted-foreground">
          {status === 404
            ? 'This restaurant is not accepting orders right now.'
            : 'We couldn’t load this restaurant. Please try again.'}
        </p>
        <Button variant="outline" asChild>
          <Link to="/">Browse other restaurants</Link>
        </Button>
      </div>
    );
  }

  const merchant = merchantQuery.data;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 flex items-start gap-4">
        {merchant.storefront_image_url ? (
          <img
            src={merchant.storefront_image_url}
            alt=""
            className="h-20 w-20 rounded-lg object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground/50" aria-hidden />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{merchant.display_name}</h1>
          {merchant.city && (
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden />
              {merchant.city}
            </p>
          )}
        </div>
      </header>

      {catalogQuery.isError ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">We couldn&apos;t load the menu.</p>
          <Button variant="outline" onClick={() => catalogQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : productsByCategory.size === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            This restaurant hasn&apos;t added any items yet.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {[...productsByCategory.entries()].map(([categoryName, products]) => (
            <section key={categoryName} aria-label={categoryName}>
              <h2 className="text-xl font-semibold mb-4">{categoryName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={setSelectedProduct}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ProductDetailDialog
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
