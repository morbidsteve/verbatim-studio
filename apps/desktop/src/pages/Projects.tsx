import { useState, useMemo } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Textarea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@verbatim/ui';
import {
  Plus,
  Search,
  FolderOpen,
  MoreVertical,
  Clock,
  FileAudio,
  Archive,
  Trash2,
  Edit,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, type Project } from '../stores/project-store';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function Projects() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const projects = useProjectStore((state) => state.projects);
  const addProject = useProjectStore((state) => state.addProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Filter by status
      if (!showArchived && project.status === 'archived') return false;
      if (project.status === 'deleted') return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [projects, searchQuery, showArchived]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      status: 'active',
      recordingCount: 0,
      totalDuration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addProject(newProject);
    setNewProjectName('');
    setNewProjectDescription('');
    setCreateDialogOpen(false);
    navigate(`/projects/${newProject.id}`);
  };

  const handleUpdateProject = () => {
    if (!editingProject || !newProjectName.trim()) return;

    updateProject(editingProject.id, {
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
    });

    setEditingProject(null);
    setNewProjectName('');
    setNewProjectDescription('');
  };

  const handleArchiveProject = (projectId: string) => {
    updateProject(projectId, { status: 'archived' });
  };

  const handleRestoreProject = (projectId: string) => {
    updateProject(projectId, { status: 'active' });
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setNewProjectDescription(project.description || '');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            {showArchived && ' (including archived)'}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your recordings and transcriptions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter project description..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showArchived ? 'secondary' : 'outline'}
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">
              {searchQuery ? 'No matching projects' : 'No projects yet'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first project to start transcribing'}
            </p>
            {!searchQuery && (
              <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(project);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {project.status === 'active' ? (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveProject(project.id);
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreProject(project.id);
                          }}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Restore
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileAudio className="h-4 w-4" />
                    <span>{project.recordingCount} recordings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(project.totalDuration)}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog
        open={editingProject !== null}
        onOpenChange={(open) => !open && setEditingProject(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update your project details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter project description..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={!newProjectName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
