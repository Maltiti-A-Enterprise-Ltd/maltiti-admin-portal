import { DestroyRef, inject, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Batch } from '@features/batches/models/batch.model';
import { LightProduct } from '@features/products/models/product.model';
import { BatchApiService } from '@features/batches/services/batch-api.service';
import { ProductApiService } from '@features/products/services/product-api.service';

/**
 * What the sale form needs to offer: the catalogue, and the batches behind
 * it.
 *
 * Lifted out of the component, which was at its length limit. The two
 * belong together anyway — batches are fetched by product id, so the second
 * request cannot be made until the first has answered, and reading them
 * apart hides that ordering.
 */
export interface SaleFormCatalogue {
  readonly products: Signal<LightProduct[]>;
  /** Batches keyed by the product they belong to. Empty until loaded. */
  readonly batchesByProductId: Signal<Map<string, Batch[]>>;
}

/** Must be called from an injection context; starts loading immediately. */
export function saleFormCatalogue(): SaleFormCatalogue {
  const productApi = inject(ProductApiService);
  const batchApi = inject(BatchApiService);
  const messages = inject(MessageService);
  const destroyRef = inject(DestroyRef);

  const products = signal<LightProduct[]>([]);
  const batchesByProductId = signal<Map<string, Batch[]>>(new Map());

  const fail = (detail: string): void => {
    messages.add({ severity: 'error', summary: 'Error', detail });
  };

  const loadBatches = (): void => {
    const productIds = products().map((product) => product.id);

    if (productIds.length === 0) {
      return;
    }

    batchApi
      .getBatchesByProductIds(productIds)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (response) => {
          const byProduct = new Map<string, Batch[]>();

          response.data.forEach((batch) => {
            const productId = batch.product?.id;

            if (!productId) {
              return;
            }

            byProduct.set(productId, [...(byProduct.get(productId) ?? []), batch]);
          });

          batchesByProductId.set(byProduct);
        },
        error: () => fail('Failed to load batches. Please refresh the page.'),
      });
  };

  productApi
    .getAllProductsSimple()
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe({
      next: (response) => {
        products.set(response.data);
        loadBatches();
      },
      error: () => fail('Failed to load products. Please refresh the page.'),
    });

  return { products, batchesByProductId };
}
