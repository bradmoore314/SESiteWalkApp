import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import BasicFloorplanViewer from '@/components/floorplans/BasicFloorplanViewer';
import { useProject } from '@/context/ProjectContext';

const FloorplansPage = () => {
  const [, params] = useRoute('/projects/:projectId/floorplans');
  const [location] = useLocation();
  const { currentProject, setCurrentProject, allProjects } = useProject();
  
  // Try to get project ID from route params first
  const projectIdFromParams = params ? parseInt(params.projectId) : null;
  
  // Use current project ID if we have one and no route params
  const projectId = projectIdFromParams || (currentProject ? currentProject.id : null);

  // When projectId is available and different from currentProject, update the current project
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      const project = allProjects.find(p => p.id === projectId);
      if (project) {
        setCurrentProject(project);
      }
    }
  }, [projectId, currentProject, allProjects, setCurrentProject]);

  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      return await res.json();
    },
    enabled: !!projectId,
  });

  const refreshAccessPointsAndCameras = () => {
    // This function can be called after markers are updated
    // to refresh any other data that depends on them
  };

  if (isLoadingProject) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-semibold">Site Walk Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The site walk you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Floorplans - {project.name}</h1>
      </div>

      <div className="mb-8">
        <p className="text-muted-foreground mb-4">
          Upload PDF floorplans and mark the locations of access points and cameras. 
          Click on the floorplan to place markers. Red markers represent access points, blue markers represent cameras.
        </p>
        
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <BasicFloorplanViewer 
            projectId={projectId as number} 
            onMarkersUpdated={refreshAccessPointsAndCameras}
          />
        </div>
      </div>
    </div>
  );
};

export default FloorplansPage;