import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Crown } from 'lucide-react';
import { useDepartments } from '@/hooks/use-departments';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export function DepartmentsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useDepartments({ page, limit: 10, search: search || undefined });

  const departments = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Manage organizational departments.">
        <Button onClick={() => navigate('/departments/new')}>
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No departments found"
              description="Create your first department to start organizing your team."
              action={
                <Button onClick={() => navigate('/departments/new')}>
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => {
                    const head = dept.head;
                    return (
                      <TableRow
                        key={dept._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/departments/${dept._id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            {dept.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{dept.code}</Badge>
                        </TableCell>
                        <TableCell>
                          {head ? (
                            <div className="flex items-center gap-1.5">
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-sm">{head.firstName} {head.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={dept.isActive ? 'success' : 'secondary'}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/departments/${dept._id}/edit`); }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {meta && (
                <div className="border-t px-4">
                  <Pagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    total={meta.total}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
