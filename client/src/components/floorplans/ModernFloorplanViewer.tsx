import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Loader2, 
  Upload, 
  Plus, 
  X, 
  MapPin, 
  Video, 
  ArrowUpDown, // Instead of Elevator which doesn't exist
  Phone, 
  StickyNote,
  Maximize, 
  Minimize, 
  ChevronsLeft, 
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Trash,
  Copy,
  MoreVertical,
  Edit
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Marker colors by type
const markerColors = {
  access_point: '#FF4D4F', // Red
  camera: '#1890FF',       // Blue
  elevator: '#722ED1',     // Purple
  intercom: '#13C2C2',     // Teal
  note: '#FAAD14'          // Yellow/Orange
};

// Marker icons by type
const MarkerIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'access_point':
      return <MapPin size={16} />;
    case 'camera':
      return <Video size={16} />;
    case 'elevator':
      return <Elevator size={16} />;
    case 'intercom':
      return <Phone size={16} />;
    case 'note':
      return <StickyNote size={16} />;
    default:
      return <MapPin size={16} />;
  }
};

interface ModernFloorplanViewerProps {
  projectId: number;
  onMarkersUpdated?: () => void;
}

const ModernFloorplanViewer = ({ projectId, onMarkersUpdated }: ModernFloorplanViewerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for floorplan management
  const [newFloorplanName, setNewFloorplanName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedFloorplanId, setSelectedFloorplanId] = useState<number | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfScale, setPdfScale] = useState(1);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  // State for marker management
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [markerType, setMarkerType] = useState<'access_point' | 'camera' | 'elevator' | 'intercom' | 'note'>('access_point');
  const [newMarkerPosition, setNewMarkerPosition] = useState<{x: number, y: number} | null>(null);
  const [markerLabel, setMarkerLabel] = useState('');
  const [draggedMarker, setDraggedMarker] = useState<number | null>(null);
  const [markerSize, setMarkerSize] = useState<Record<number, {width: number, height: number}>>({});
  
  // Fetch floorplans for this project
  const { 
    data: floorplans = [], 
    isLoading: isLoadingFloorplans,
    refetch: refetchFloorplans 
  } = useQuery({
    queryKey: ['/api/projects', projectId, 'floorplans'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/floorplans`);
      return await res.json();
    },
    enabled: !!projectId,
  });
  
  // Get the selected floorplan
  const selectedFloorplan = floorplans.find(f => f.id === selectedFloorplanId) || null;
  
  // Fetch markers for the selected floorplan
  const { 
    data: markers = [], 
    isLoading: isLoadingMarkers,
    refetch: refetchMarkers
  } = useQuery({
    queryKey: ['/api/floorplans', selectedFloorplanId, 'markers'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/floorplans/${selectedFloorplanId}/markers`);
      return await res.json();
    },
    enabled: !!selectedFloorplanId,
  });
  
  // Create a new floorplan
  const uploadFloorplanMutation = useMutation({
    mutationFn: async (floorplanData: any) => {
      const res = await apiRequest('POST', '/api/floorplans', floorplanData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Floorplan Uploaded",
        description: "The floorplan has been successfully uploaded.",
      });
      
      // Reset form
      setNewFloorplanName('');
      setPdfFile(null);
      
      // Close the dialog
      setUploadDialogOpen(false);
      
      // Refetch floorplans
      refetchFloorplans();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: `Error uploading floorplan: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Create a new marker
  const createMarkerMutation = useMutation({
    mutationFn: async (markerData: any) => {
      const res = await apiRequest('POST', '/api/floorplan-markers', markerData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Marker Added",
        description: `New ${markerType} marker has been added.`,
      });
      
      // Close the dialog
      setMarkerDialogOpen(false);
      
      // Reset form
      setMarkerLabel('');
      setMarkerType('access_point');
      
      // Refetch markers
      refetchMarkers();
      
      // Callback
      if (onMarkersUpdated) onMarkersUpdated();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Marker",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete a marker
  const deleteMarkerMutation = useMutation({
    mutationFn: async (markerId: number) => {
      const res = await apiRequest('DELETE', `/api/floorplan-markers/${markerId}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Marker Deleted",
        description: "The marker has been removed.",
      });
      
      // Refetch markers
      refetchMarkers();
      
      // Callback
      if (onMarkersUpdated) onMarkersUpdated();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete a floorplan
  const deleteFloorplanMutation = useMutation({
    mutationFn: async (floorplanId: number) => {
      const res = await apiRequest('DELETE', `/api/floorplans/${floorplanId}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Floorplan Deleted",
        description: "The floorplan has been removed.",
      });
      
      // Reset selected floorplan
      setSelectedFloorplanId(null);
      
      // Refetch floorplans
      refetchFloorplans();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Set first floorplan as selected if none is selected
  useEffect(() => {
    if (floorplans.length > 0 && !selectedFloorplanId) {
      setSelectedFloorplanId(floorplans[0].id);
    }
  }, [floorplans, selectedFloorplanId]);
  
  // Create blob URL for PDF display
  useEffect(() => {
    if (selectedFloorplan) {
      try {
        // Clean up previous blob URL
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
        }

        try {
          // Convert base64 string to binary
          const byteCharacters = atob(selectedFloorplan.pdf_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          
          // Create blob from binary data
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        } catch (err) {
          console.error('Error processing PDF data:', err);
          setPdfBlobUrl(null);
          toast({
            title: "Error",
            description: "Failed to load PDF data",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Error creating blob URL:', err);
        setPdfBlobUrl(null);
        toast({
          title: "Error",
          description: "Failed to process PDF data",
          variant: "destructive",
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [selectedFloorplan]);
  
  // Handle file change for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };
  
  // Handle floorplan upload
  const handleUploadFloorplan = async () => {
    if (!pdfFile || !newFloorplanName) {
      toast({
        title: "Error",
        description: "Please provide a name and select a PDF file",
        variant: "destructive",
      });
      return;
    }

    // Make sure we're uploading a PDF file
    if (!pdfFile.type.includes('pdf')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a PDF file (application/pdf)",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show that we're processing the file
      toast({
        title: "Processing",
        description: `Converting ${pdfFile.name} (${Math.round(pdfFile.size / 1024)} KB)`,
      });

      // Convert PDF to base64
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (e.target && e.target.result) {
            const result = e.target.result.toString();
            // Make sure we have a data URL
            if (!result.startsWith('data:')) {
              throw new Error('Invalid file format');
            }
            
            const base64 = result.split(',')[1];
            if (!base64) {
              throw new Error('Failed to extract base64 data');
            }
            
            await uploadFloorplanMutation.mutateAsync({
              name: newFloorplanName,
              pdf_data: base64,
              project_id: projectId
            });
          }
        } catch (err) {
          console.error('Error processing file:', err);
          toast({
            title: "Upload Error",
            description: `Error processing the PDF: ${err instanceof Error ? err.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Failed to read the PDF file",
          variant: "destructive",
        });
      };
      
      reader.readAsDataURL(pdfFile);
    } catch (err) {
      console.error('Upload preparation error:', err);
      toast({
        title: "Error",
        description: `Failed to prepare the file for upload: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  // Handle PDF container click for marker placement
  const handlePdfContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingMarker || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate position as percentage of container
    // Round to integer as the server expects integer values
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    setNewMarkerPosition({ x, y });
    setMarkerDialogOpen(true);
  };
  
  // Handle marker drag
  const handleDragStart = (e: React.MouseEvent, markerId: number) => {
    if (isAddingMarker) return; // Don't allow dragging when in adding mode
    setDraggedMarker(markerId);
    e.stopPropagation();
  };
  
  // Handle marker position update after drag
  const updateMarkerPosition = (markerId: number, x: number, y: number) => {
    const markerToUpdate = markers.find(m => m.id === markerId);
    
    if (markerToUpdate) {
      apiRequest('PUT', `/api/floorplan-markers/${markerId}`, {
        position_x: x,
        position_y: y,
        // Add these required fields
        floorplan_id: markerToUpdate.floorplan_id,
        page: markerToUpdate.page,
        marker_type: markerToUpdate.marker_type,
        equipment_id: markerToUpdate.equipment_id,
        label: markerToUpdate.label
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update marker position');
        }
        return response.json();
      })
      .then(() => {
        // Refresh markers
        queryClient.invalidateQueries({ queryKey: ['/api/floorplans', selectedFloorplan?.id, 'markers'] });
      })
      .catch(err => {
        console.error('Error updating marker position:', err);
        toast({
          title: "Error",
          description: "Failed to update marker position",
          variant: "destructive",
        });
      });
    }
  };
  
  // Setup event listeners for drag operations
  useEffect(() => {
    if (!draggedMarker) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      // Calculate the new position as percentage
      // Round to integer as the server expects integer values
      const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
      
      // Update marker position in UI immediately for smooth movement
      const markerElement = document.getElementById(`marker-${draggedMarker}`);
      if (markerElement) {
        markerElement.style.left = `${x}%`;
        markerElement.style.top = `${y}%`;
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!draggedMarker || !containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calculate position as percentage
      const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
      const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
      
      // Update marker position in backend
      updateMarkerPosition(draggedMarker, x, y);
      
      // Reset dragged marker
      setDraggedMarker(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedMarker, containerRef.current]);
  
  // Create a new marker
  const handleAddMarker = () => {
    if (!selectedFloorplanId || !newMarkerPosition) return;
    
    createMarkerMutation.mutate({
      floorplan_id: selectedFloorplanId,
      page: 1, // Default to first page
      marker_type: markerType,
      equipment_id: 0, // Create a new equipment entry
      position_x: newMarkerPosition.x,
      position_y: newMarkerPosition.y,
      label: markerLabel || null
    });
  };
  
  // Zoom controls
  const zoomIn = () => setPdfScale(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setPdfScale(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setPdfScale(1);
  
  if (isLoadingFloorplans) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading floorplans...</span>
      </div>
    );
  }
  
  return (
    <div className="floorplan-viewer">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          {/* Floorplan Selector */}
          <Select 
            value={selectedFloorplanId?.toString() || ''} 
            onValueChange={(value) => setSelectedFloorplanId(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a floorplan" />
            </SelectTrigger>
            <SelectContent>
              {floorplans.map((floorplan) => (
                <SelectItem key={floorplan.id} value={floorplan.id.toString()}>
                  {floorplan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Upload New Button */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Floorplan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Floorplan</DialogTitle>
                <DialogDescription>
                  Upload a PDF file of the floorplan. You'll be able to mark locations of equipment on this plan.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="floorplan-name">Floorplan Name</Label>
                  <Input
                    id="floorplan-name"
                    placeholder="e.g., 1st Floor, Lobby, etc."
                    value={newFloorplanName}
                    onChange={(e) => setNewFloorplanName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="pdf-file">PDF File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pdf-file"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                  {pdfFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                    </p>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUploadFloorplan} 
                  disabled={!pdfFile || !newFloorplanName || uploadFloorplanMutation.isPending}
                >
                  {uploadFloorplanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Delete Floorplan Button */}
          {selectedFloorplanId && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Floorplan</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this floorplan? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteFloorplanMutation.mutate(selectedFloorplanId)}
                    disabled={deleteFloorplanMutation.isPending}
                  >
                    {deleteFloorplanMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Floorplan'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Equipment Marker Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isAddingMarker ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAddingMarker(!isAddingMarker)}
            disabled={!selectedFloorplanId}
          >
            {isAddingMarker ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Marker
              </>
            )}
          </Button>
          
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={zoomOut} disabled={!selectedFloorplanId}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetZoom} disabled={!selectedFloorplanId}>
              {Math.round(pdfScale * 100)}%
            </Button>
            <Button variant="outline" size="icon" onClick={zoomIn} disabled={!selectedFloorplanId}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Floorplan Display Area */}
      {selectedFloorplan ? (
        <div className="border rounded-lg overflow-auto relative" style={{ height: 'calc(100vh - 250px)' }}>
          <div
            ref={containerRef}
            className="relative floorplan-container"
            onClick={handlePdfContainerClick}
            style={{ 
              cursor: isAddingMarker ? 'crosshair' : 'default',
              transform: `scale(${pdfScale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease-out'
            }}
          >
            {pdfBlobUrl ? (
              <object
                data={pdfBlobUrl}
                type="application/pdf"
                className="w-full h-auto"
                style={{ pointerEvents: isAddingMarker ? 'none' : 'auto' }}
              >
                <p>Unable to display PDF. Please download it to view.</p>
              </object>
            ) : (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading PDF...</span>
              </div>
            )}
            
            {/* Markers */}
            {!isLoadingMarkers && markers.map((marker) => (
              <div
                id={`marker-${marker.id}`}
                key={marker.id}
                className="absolute rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{
                  left: `${marker.position_x}%`,
                  top: `${marker.position_y}%`,
                  width: `${markerSize[marker.id]?.width || 24}px`,
                  height: `${markerSize[marker.id]?.height || 24}px`,
                  backgroundColor: markerColors[marker.marker_type as keyof typeof markerColors],
                  color: 'white',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  zIndex: draggedMarker === marker.id ? 1000 : 100,
                  transition: draggedMarker === marker.id ? 'none' : 'all 0.2s ease-out',
                  border: '2px solid white',
                  pointerEvents: isAddingMarker ? 'none' : 'auto' // Disable marker interaction during adding mode
                }}
                onMouseDown={(e) => handleDragStart(e, marker.id)}
              >
                <MarkerIcon type={marker.marker_type} />
                
                {/* Context Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="absolute top-0 right-0 -mt-1 -mr-1 bg-white rounded-full p-0.5 shadow-sm">
                    <MoreVertical size={12} className="text-gray-600" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => deleteMarkerMutation.mutate(marker.id)}>
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      // Duplicate marker logic
                      createMarkerMutation.mutate({
                        floorplan_id: marker.floorplan_id,
                        page: marker.page,
                        marker_type: marker.marker_type,
                        equipment_id: 0, // Create a new equipment
                        position_x: Math.min(100, marker.position_x + 2),
                        position_y: Math.min(100, marker.position_y + 2),
                        label: marker.label ? `${marker.label} (Copy)` : null
                      });
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      // Edit marker logic (placeholder)
                      toast({
                        title: "Info",
                        description: "Edit functionality coming soon",
                      });
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border rounded-lg h-64">
          <div className="text-center p-6">
            <h3 className="text-lg font-medium">No Floorplans Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a floorplan to get started.
            </p>
            <Button 
              className="mt-4" 
              variant="default" 
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Floorplan
            </Button>
          </div>
        </div>
      )}
      
      {/* Marker Legend */}
      {selectedFloorplan && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Marker Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: markerColors.access_point }}></div>
              <span className="text-sm">Access Points ({markers.filter(m => m.marker_type === 'access_point').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: markerColors.camera }}></div>
              <span className="text-sm">Cameras ({markers.filter(m => m.marker_type === 'camera').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: markerColors.elevator }}></div>
              <span className="text-sm">Elevators ({markers.filter(m => m.marker_type === 'elevator').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: markerColors.intercom }}></div>
              <span className="text-sm">Intercoms ({markers.filter(m => m.marker_type === 'intercom').length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: markerColors.note }}></div>
              <span className="text-sm">Notes ({markers.filter(m => m.marker_type === 'note').length})</span>
            </div>
          </div>
        </div>
      )}
      
      {/* New Marker Dialog */}
      <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Marker</DialogTitle>
            <DialogDescription>
              Create a new marker at the selected location.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="marker-type">Marker Type</Label>
              <Tabs 
                defaultValue="access_point" 
                value={markerType} 
                onValueChange={(value) => setMarkerType(value as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-5 mb-2">
                  <TabsTrigger value="access_point">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Access</span>
                  </TabsTrigger>
                  <TabsTrigger value="camera">
                    <Video className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Camera</span>
                  </TabsTrigger>
                  <TabsTrigger value="elevator">
                    <Elevator className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Elevator</span>
                  </TabsTrigger>
                  <TabsTrigger value="intercom">
                    <Phone className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Intercom</span>
                  </TabsTrigger>
                  <TabsTrigger value="note">
                    <StickyNote className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Note</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="marker-label">Label (Optional)</Label>
              <Input
                id="marker-label"
                placeholder="e.g., Main Entrance, Elevator #1"
                value={markerLabel}
                onChange={(e) => setMarkerLabel(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setMarkerDialogOpen(false);
                setMarkerLabel('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddMarker} 
              disabled={createMarkerMutation.isPending}
            >
              {createMarkerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Marker'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernFloorplanViewer;