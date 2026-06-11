import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useSignup } from '@/hooks/useAuth';
import { normalizeApiError } from '@/lib/apiError';
import { applyServerErrors } from '@/lib/formErrors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const signupSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  // Mirrors the API's MinimumLengthValidator; other Django validators
  // (common/numeric passwords) are surfaced as server-side field errors.
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone_number: z.string().max(32, 'Phone number is too long.').optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function RegisterPage() {
  const signup = useSignup();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', phone_number: '' },
  });

  const onSubmit = (values: SignupFormValues) => {
    signup.mutate(
      {
        email: values.email,
        password: values.password,
        phone_number: values.phone_number || undefined,
      },
      {
        onError: (error) => {
          const normalized = normalizeApiError(error);
          applyServerErrors(normalized, form.setError, [
            'email',
            'password',
            'phone_number',
          ]);
        },
      },
    );
  };

  const rootError = form.formState.errors.root?.serverError?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Order from your favorite restaurants in minutes</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>At least 8 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+63 912 345 6789"
                        autoComplete="tel"
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
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-brand-hover text-white"
                disabled={signup.isPending}
              >
                {signup.isPending ? 'Creating account…' : 'Create account'}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-brand hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
