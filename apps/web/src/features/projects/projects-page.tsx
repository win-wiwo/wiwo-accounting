import { useState } from 'react';
import { Plus, Pencil, FolderOpen, Archive, CheckCircle2, Loader2 } from 'lucide-react';
import type { Project, ProjectStatus } from '@prams/shared';
import { useProjects, useCreateProject, useUpdateProject } from '@/hooks/use-projects';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_VARIANTS: Record<ProjectStatus, 'success' | 'info' | 'secondary'> = {
  active: 'success',
  completed: 'info',
  archived: 'secondary',
};

const statusIcon = (status: ProjectStatus) => {
  switch (status) {
    case 'active': return <FolderOpen className="h-4 w-4 text-emerald-500" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case 'archived': return <Archive className="h-4 w-4 text-muted-foreground" />;
  }
};

// ─── Project Form Dialog ─────────────────────────────────────────────────────

interface ProjectFormDialogProps {
  project?: Project;
  open: boolean;
  onClose: () => void;
}

function ProjectFormDialog({ project, open, onClose }: ProjectFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? '');
  const [code, setCode] = useState(project?.code ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active');

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleOpen = (open: boolean) => {
    if (open) {
      setName(project?.name ?? '');
      setCode(project?.code ?? '');
      setDescription(project?.description ?? '');
      setStatus(project?.status ?? 'active');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Project name is required', variant: 'error' });
      return;
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: project._id,
          data: { name: name.trim(), code: code.trim() || undefined, description: description.trim() || undefined, status },
        });
        toast({ title: 'Project updated', variant: 'success' });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
        });
        toast({ title: 'Project created', variant: 'success' });
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Something went wrong';
      toast({ title: msg, variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { handleOpen(v); if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name <span className="text-destructive">*</span></Label>
            <Input
              id="proj-name"
              placeholder="e.g. Office Renovation Phase 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-code">
              Project Code
              <span className="text-xs text-muted-foreground ml-1">(optional, e.g. ORP2)</span>
            </Label>
            <Input
              id="proj-code"
              placeholder="Short identifier"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={20}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <textarea
              id="proj-desc"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Brief description of this project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>(undefined);

  const { data, isLoading } = useProjects({ search: search || undefined, status: statusFilter || undefined });
  const projects = (data?.data ?? []) as Project[];

  const openCreate = () => { setEditProject(undefined); setDialogOpen(true); };
  const openEdit = (p: Project) => { setEditProject(p); setDialogOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Company projects that can be referenced in purchase requests."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search projects..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No projects found"
          description={search ? 'Try a different search term.' : 'Create the first project to get started.'}
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const createdBy = typeof project.createdBy === 'object' && project.createdBy
              ? `${project.createdBy.firstName} ${project.createdBy.lastName}`
              : '—';
            return (
              <Card key={project._id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="shrink-0">{statusIcon(project.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{project.name}</p>
                      {project.code && (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{project.code}</span>
                      )}
                      <Badge variant={STATUS_VARIANTS[project.status]} className="text-[11px]">
                        {STATUS_LABELS[project.status]}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Created by {createdBy}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(project)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectFormDialog
        project={editProject}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
