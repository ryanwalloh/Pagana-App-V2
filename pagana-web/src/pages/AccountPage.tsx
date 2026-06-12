import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useCustomerProfile, useUpdateCustomerProfile } from '@/api/customers';
import { normalizeApiError } from '@/lib/apiError';
import { applyServerErrors } from '@/lib/formErrors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';

const profileSchema = z.object({
  display_name: z.string().max(255, 'Name is too long.'),
  preferred_contact_phone: z.string().max(32, 'Phone number is too long.'),
  default_delivery_notes: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const profileQuery = useCustomerProfile();
  const updateProfile = useUpdateCustomerProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      preferred_contact_phone: '',
      default_delivery_notes: '',
    },
  });

  const { reset } = form;
  useEffect(() => {
    if (profileQuery.data) {
      reset({
        display_name: profileQuery.data.display_name,
        preferred_contact_phone: profileQuery.data.preferred_contact_phone,
        default_delivery_notes: profileQuery.data.default_delivery_notes,
      });
    }
  }, [profileQuery.data, reset]);

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values, {
      onSuccess: () => toast.success('Profile saved.'),
      onError: (error) => {
        applyServerErrors(normalizeApiError(error), form.setError, [
          'display_name',
          'preferred_contact_phone',
          'default_delivery_notes',
        ]);
      },
    });
  };

  if (profileQuery.isPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-muted-foreground">We couldn&apos;t load your profile.</p>
        <Button variant="outline" onClick={() => profileQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const rootError = form.formState.errors.root?.serverError?.message;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            These details pre-fill your checkout so ordering is faster.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferred_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred contact phone</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_delivery_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default delivery notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Landmarks, gate codes, drop-off instructions…"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Added automatically to every new order (editable at checkout).
                    </FormDescription>
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
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
