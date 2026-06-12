import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { normalizeApiError } from '@/lib/apiError';
import { applyServerErrors } from '@/lib/formErrors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  deliverySchema,
  emptyDeliveryValues,
  type DeliveryFormValues,
} from './deliverySchema';

const FIELD_NAMES = [
  'recipient_name',
  'recipient_phone',
  'delivery_address_line_1',
  'delivery_address_line_2',
  'delivery_city',
  'delivery_state',
  'delivery_postal_code',
  'delivery_country',
  'delivery_notes',
] as const;

export function DeliveryDetailsForm({
  initialValues,
  onSubmit,
  isSubmitting,
}: {
  initialValues?: DeliveryFormValues;
  /** Rejections are mapped onto form fields (DRF field errors) or a root error. */
  onSubmit: (values: DeliveryFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: initialValues ?? emptyDeliveryValues,
  });

  const handleSubmit = (values: DeliveryFormValues) =>
    onSubmit(values).catch((error) => {
      applyServerErrors(normalizeApiError(error), form.setError, [...FIELD_NAMES]);
    });

  const rootError = form.formState.errors.root?.serverError?.message;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="recipient_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipient_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+63 912 345 6789" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="delivery_address_line_1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street address</FormLabel>
              <FormControl>
                <Input autoComplete="address-line1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="delivery_address_line_2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
              <FormControl>
                <Input autoComplete="address-line2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="delivery_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="delivery_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Province (optional)</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="delivery_postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal code</FormLabel>
                <FormControl>
                  <Input autoComplete="postal-code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="delivery_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  {/* Single-country launch (WBS M4-F2-T2): fixed to PH. */}
                  <Input value="Philippines (PH)" readOnly disabled aria-readonly />
                </FormControl>
                <input type="hidden" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="delivery_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Landmarks, gate codes, drop-off instructions…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {rootError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {rootError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-brand hover:bg-brand-hover text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Checking…' : 'Continue to review'}
        </Button>
      </form>
    </Form>
  );
}
