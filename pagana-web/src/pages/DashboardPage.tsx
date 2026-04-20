import { useUsers } from '@/api/users';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { data: users, isLoading, error } = useUsers();
  const { mutate: logout } = useLogout();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Pagana Dashboard</h1>
          <Button onClick={() => logout()} variant="outline">
            Logout
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Users List</CardTitle>
            <CardDescription>Example React Query data fetching</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <div>Loading users...</div>}
            {error && <div className="text-red-600">Error loading users</div>}
            {users && (
              <ul className="space-y-2">
                {users.map((user) => (
                  <li key={user.id} className="p-2 border rounded">
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

