import Link from 'next/link';
import { formatDateForHydration } from '@/lib/utils/date';

interface AssignmentProps {
  assignment: any;
}

export function AssignmentCard({ assignment }: AssignmentProps) {
  return (
    <div className="p-4 border border-border bg-card rounded-none hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
          {assignment.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {assignment.description || 'No description provided.'}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1 font-semibold text-primary/80">
            📄 {assignment.content_type.toUpperCase()}
          </span>
          {assignment.teacher && (
            <span className="flex items-center gap-1">
              🧑‍🏫 {assignment.teacher.full_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            📅 {formatDateForHydration(assignment.created_at)}
          </span>
        </div>
      </div>
      
      <div className="flex-shrink-0 self-start md:self-center">
        {assignment.content_type === 'link' || assignment.content_type === 'pdf' ? (
          <a
            href={assignment.content}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 text-xs font-bold transition-colors border border-border"
          >
            View Assignment
          </a>
        ) : (
          <div className="text-xs text-muted-foreground border p-2 bg-muted/20">
            Text based
          </div>
        )}
      </div>
    </div>
  );
}
