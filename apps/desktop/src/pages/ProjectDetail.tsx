import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@verbatim/ui';

export function ProjectDetail() {
  const { projectId } = useParams();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Project Details</h1>
      <Card>
        <CardHeader>
          <CardTitle>Project ID: {projectId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Project details will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
