import { useState } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  Plus,
  Pencil,
  FolderOpen,
  Archive,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { Project, ProjectStatus } from '@prams/shared';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
} from '@/hooks/use-projects';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PageHeader,
  PrimaryButton,
  Surface,
  FilterBar,
  SearchInput,
  FilterControls,
  premiumSelectTriggerClass,
  StatusBadge,
  EmptyState,
  GhostButton,
  type BadgeTone,
} from '@/components/premium';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active:    'Active',
  completed: 'Completed',
  archived:  'Archived',
};

const STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  active:    'success',
  completed: 'info',
  archived:  'gray',
};

const statusIcon = (status: ProjectStatus) => {
  switch (status) {
    case 'active':    return <FolderOpen className="h-4 w-4 text-emerald-500" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case 'archived':  return <Archive className="h-4 w-4 text-zinc-400" />;
  }
};

// ─── Project Form Dialog ─────────────────────────────────────

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
          data: {
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || undefined,
            status,
          },
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Something went wrong';
      toast({ title: msg, variant: 'error' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        handleOpen(v);
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">
              Project Name <span className="text-destructive">*</span>
            </Label>
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
            <Label htmlFor="proj-desc">
              Description{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
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
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────

export function ProjectsPage() {
  usePageTitle('Projects');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>(undefined);

  const { data, isLoading } = useProjects({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const projects = (data?.data ?? []) as Project[];

  const openCreate = () => {
    setEditProject(undefined);
    setDialogOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditProject(p);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <PageHeader
        title="Projects"
        description="Company projects that can be referenced in purchase requests."
        actions={
          <PrimaryButton onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Project
          </PrimaryButton>
        }
      />

      <FilterBar delay={0.04}>
        <SearchInput
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterControls>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className={`${premiumSelectTriggerClass} w-full sm:w-[150px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </FilterControls>
      </FilterBar>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Surface delay={0.08}>
          <EmptyState
            icon={<FolderOpen />}
            title="No projects found"
            description={
              search
                ? 'Try a different search term.'
                : 'Create the first project to get started.'
            }
            action={
              !search ? (
                <PrimaryButton onClick={openCreate}>
                  <Plus className="h-4 w-4" /> New Project
                </PrimaryButton>
              ) : undefined
            }
          />
        </Surface>
      ) : (
        <div
          className="pr-list-section space-y-2"
          style={{ animationDelay: '0.08s' }}
        >
          {projects.map((project, idx) => {
            const createdBy =
              typeof project.createdBy === 'object' && project.createdBy
                ? `${project.createdBy.firstName} ${project.createdBy.lastName}`
                : '—';
            return (
              <div
                key={project._id}
                className="pr-row-enter rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-zinc-300/80"
                style={{ animationDelay: `${0.04 + idx * 0.025}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0">{statusIcon(project.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-zinc-900">
                        {project.name}
                      </p>
                      {project.code && (
                        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                          {project.code}
                        </span>
                      )}
                      <StatusBadge tone={STATUS_TONE[project.status]}>
                        {STATUS_LABELS[project.status]}
                      </StatusBadge>
                    </div>
                    {project.description && (
                      <p className="text-[12px] text-zinc-500 mt-0.5 truncate">
                        {project.description}
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-400 mt-1">Created by {createdBy}</p>
                  </div>
                  <GhostButton onClick={() => openEdit(project)} className="shrink-0">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </GhostButton>
                </div>
              </div>
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
