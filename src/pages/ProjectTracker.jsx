import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const priorityColors = {
  Critical: 'bg-red-500 text-white',
  High: 'bg-amber-500 text-white',
  Medium: 'bg-blue-500 text-white',
  Low: 'bg-green-500 text-white',
};

export default function ProjectTracker() {
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ task_name: '', category: '', priority: 'Medium', status: 'To Do', notes: '' });
  
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['projectTasks'],
    queryFn: () => base44.entities.ProjectTasks.list(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTasks.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      setShowNewTaskForm(false);
      setNewTask({ task_name: '', category: '', priority: 'Medium', status: 'To Do', notes: '' });
      toast.success('Task created');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  const handleStatusChange = (taskId, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'Done') {
      const today = new Date().toISOString().split('T')[0];
      updates.completed_at = today;
    }
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const handleCreateTask = () => {
    if (!newTask.task_name || !newTask.category) {
      toast.error('Task name and category are required');
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  // Group tasks by category and sort by priority
  const groupedTasks = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const cat = task.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(task);
    });
    
    // Sort tasks within each group by priority
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999));
    });
    
    return groups;
  }, [tasks]);

  // Calculate progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Project Tracker</h1>
          <p className="text-muted-foreground">Track and manage your project tasks</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{progressPercent}% Complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{completedTasks} of {totalTasks} tasks completed</p>
        </div>

        {/* Add Task Button */}
        <div className="mb-6 flex justify-end">
          <Button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* New Task Form */}
        {showNewTaskForm && (
          <div className="mb-8 p-4 bg-card border border-border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Task Name *</label>
                <Input
                  placeholder="Task name"
                  value={newTask.task_name}
                  onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category *</label>
                <Input
                  placeholder="Category"
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                <Select value={newTask.status} onValueChange={(v) => setNewTask({ ...newTask, status: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Notes</label>
              <Input
                placeholder="Add notes..."
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewTaskForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90">
                Create Task
              </Button>
            </div>
          </div>
        )}

        {/* Grouped Tasks */}
        <div className="space-y-6">
          {Object.keys(groupedTasks).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tasks yet. Create one to get started!</p>
            </div>
          ) : (
            Object.keys(groupedTasks).sort().map((category) => (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">{category}</h2>
                <div className="space-y-2">
                  {groupedTasks[category].map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg hover:border-border/80 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{task.task_name}</p>
                        {task.notes && <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>}
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${priorityColors[task.priority] || priorityColors.Low}`}>
                        {task.priority || 'Low'}
                      </span>

                      <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                        <SelectTrigger className="w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To Do">To Do</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                      </Select>

                      <button
                        onClick={() => deleteTaskMutation.mutate(task.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}