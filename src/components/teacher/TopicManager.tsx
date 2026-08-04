'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Tag,
  BookOpen,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Topic {
  id: string;
  name: string;
  description?: string;
  color: string;
  questionCount: number;
}

interface TopicManagerProps {
  onTopicSelect?: (topicId: string | null) => void;
  selectedTopicId?: string | null;
}

export const TopicManager: React.FC<TopicManagerProps> = ({
  onTopicSelect,
  selectedTopicId,
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicColor, setTopicColor] = useState('#3B82F6');

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  // Fetch topics
  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/teacher/topics');
      const data = await response.json();
      if (data.success) {
        setTopics(data.topics);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  // Create topic
  const handleCreateTopic = async () => {
    if (!topicName.trim()) {
      toast.error('Topic name is required');
      return;
    }

    try {
      const response = await fetch('/api/teacher/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: topicName.trim(),
          description: topicDescription.trim() || undefined,
          color: topicColor,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Topic created successfully');
        setShowCreateModal(false);
        setTopicName('');
        setTopicDescription('');
        setTopicColor('#3B82F6');
        await fetchTopics();
      } else {
        toast.error(data.error || 'Failed to create topic');
      }
    } catch (error) {
      console.error('Create topic error:', error);
      toast.error('Failed to create topic');
    }
  };

  // Update topic
  const handleUpdateTopic = async () => {
    if (!editingTopic || !topicName.trim()) {
      toast.error('Topic name is required');
      return;
    }

    try {
      const response = await fetch('/api/teacher/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTopic.id,
          name: topicName.trim(),
          description: topicDescription.trim() || undefined,
          color: topicColor,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Topic updated successfully');
        setEditingTopic(null);
        setTopicName('');
        setTopicDescription('');
        setTopicColor('#3B82F6');
        await fetchTopics();
      } else {
        toast.error(data.error || 'Failed to update topic');
      }
    } catch (error) {
      console.error('Update topic error:', error);
      toast.error('Failed to update topic');
    }
  };

  // Delete topic
  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    if (!confirm(`Are you sure you want to delete "${topicName}"? This will remove the topic from all questions.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teacher/topics?id=${topicId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Topic deleted successfully');
        if (selectedTopicId === topicId && onTopicSelect) {
          onTopicSelect(null);
        }
        await fetchTopics();
      } else {
        toast.error(data.error || 'Failed to delete topic');
      }
    } catch (error) {
      console.error('Delete topic error:', error);
      toast.error('Failed to delete topic');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Topics</h3>
          <span className="text-sm text-muted-foreground">({topics.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCreateModal(true);
            setTopicName('');
            setTopicDescription('');
            setTopicColor('#3B82F6');
          }}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          New Topic
        </Button>
      </div>

      {/* Topic List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <div 
          className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer ${
            selectedTopicId === null ? 'bg-primary/10 border border-primary/20' : ''
          }`}
          onClick={() => onTopicSelect && onTopicSelect(null)}
        >
          <div className="flex items-center gap-3">
             <div className="text-sm font-medium">All Topics</div>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No topics created yet</p>
          </div>
        ) : (
          topics.map((topic) => (
            <div
              key={topic.id}
              className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer ${
                selectedTopicId === topic.id ? 'bg-primary/10 border border-primary/20' : ''
              }`}
              onClick={() => onTopicSelect && onTopicSelect(topic.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: topic.color || '#3B82F6' }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{topic.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-muted-foreground">
                  {topic.questionCount} Q
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTopic(topic);
                    setTopicName(topic.name);
                    setTopicDescription(topic.description || '');
                    setTopicColor(topic.color || '#3B82F6');
                  }}
                  className="p-1 text-muted-foreground hover:text-primary rounded"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTopic(topic.id, topic.name);
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Topic Modal */}
      {(showCreateModal || editingTopic) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-md w-full p-6 border">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold">{editingTopic ? 'Edit Topic' : 'Create Topic'}</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTopic(null);
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Topic Name *
                </label>
                <Input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., Algebra, Physics, History"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Input
                  type="text"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setTopicColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        topicColor === color ? 'border-primary scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTopic(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}
                  className="flex-1"
                >
                  {editingTopic ? 'Update Topic' : 'Create Topic'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
