import { useAuth } from '@/features/auth/AuthProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>You are signed in to Pagana.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
