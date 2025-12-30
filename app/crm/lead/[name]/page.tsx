// app/crm/leads/[name]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  ArrowLeft, 
  Edit, 
  Mail,
  Phone,
  MapPin,
  UserCheck,
  Calendar,
  FileText,
  Plus,
  Eye,
  ListTodo,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Lead, Activity, Communication } from "@/types/crm";

interface LeadWithDetails {
  lead: Lead;
  activities: Activity[];
  communications: Communication[];
}

export default function LeadDetailPage() {
  const { push: toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [leadData, setLeadData] = useState<LeadWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "activities" | "communications">("details");

  useEffect(() => {
    fetchLead();
  }, [params.name]);

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/crm/leads/${params.name}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lead');
      }

      const data = await response.json();
      const lead = data.data.lead;
      
      // Fetch activities and communications
      const [activitiesRes, communicationsRes] = await Promise.all([
        fetch(`/api/crm/activities/by-reference?doctype=Lead&name=${params.name}`),
        fetch(`/api/crm/communications/by-reference?doctype=Lead&name=${params.name}`)
      ]);
      
      const activities = activitiesRes.ok ? (await activitiesRes.json()).data.activities : [];
      const communications = communicationsRes.ok ? (await communicationsRes.json()).data.communications : [];
      
      setLeadData({
        lead,
        activities,
        communications
      });
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error",
        description: `Failed to load lead: ${(error as Error).message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "interested":
        return "bg-purple-100 text-purple-800";
      case "not interested":
        return "bg-red-100 text-red-800";
      case "converted":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColorForActivity = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Skeleton className="h-8 w-8 mr-3" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-96 rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-80 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!leadData) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Lead Not Found</h2>
          <p className="text-muted-foreground mb-4">The lead you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/crm/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const { lead, activities, communications } = leadData;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/crm/leads')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Users className="w-8 h-8 mr-3 text-primary" />
                Lead Details
              </h1>
              <p className="text-muted-foreground">View and manage lead information</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              size="sm"
              onClick={() => router.push(`/crm/leads/${lead.name}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              size="sm"
              onClick={() => router.push(`/crm/opportunities/new?lead=${lead.name}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Opportunity
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "details"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "activities"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("activities")}
          >
            Activities
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === "communications"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("communications")}
          >
            Communications
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2">
            {activeTab === "details" && (
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Lead Name</p>
                          <p className="font-medium text-lg">{lead.lead_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lead ID</p>
                          <p className="font-medium">{lead.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                            {lead.email_id || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                            {lead.mobile_no || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Source</p>
                          <Badge variant="outline">{lead.source || "Unknown"}</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Territory</p>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                            {lead.territory || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Contact By</p>
                          <div className="flex items-center">
                            <UserCheck className="w-4 h-4 mr-2 text-muted-foreground" />
                            {lead.contact_by || "Not assigned"}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Created On</p>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            {new Date(lead.creation).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "activities" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Activities</CardTitle>
                      <CardDescription>
                        Tasks and follow-ups related to this lead
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => router.push(`/crm/activities/new?doctype=Lead&name=${lead.name}`)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assigned To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activities.map((activity) => (
                            <TableRow key={activity.name}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{activity.subject}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {activity.activity_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(activity.due_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge className={getPriorityColor(activity.priority)}>
                                  {activity.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColorForActivity(activity.status)}>
                                  {activity.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {activity.assigned_to || "Unassigned"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No activities found</p>
                      <Button className="mt-4" onClick={() => router.push(`/crm/activities/new?doctype=Lead&name=${lead.name}`)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Activity
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "communications" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Communications</CardTitle>
                      <CardDescription>
                        Email, calls, and meetings with this lead
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => router.push(`/crm/communications/new?doctype=Lead&name=${lead.name}`)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Communication
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {communications.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {communications.map((comm) => (
                            <TableRow key={comm.name}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{comm.subject}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {comm.content}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {comm.communication_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(comm.creation).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColorForActivity(comm.status)}>
                                  {comm.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No communications found</p>
                      <Button className="mt-4" onClick={() => router.push(`/crm/communications/new?doctype=Lead&name=${lead.name}`)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Communication
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          <div>
            {/* Summary Card */}
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Lead Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Name</span>
                    <span className="font-medium">{lead.lead_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Source</span>
                    <span>{lead.source || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Territory</span>
                    <span>{lead.territory || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact By</span>
                    <span>{lead.contact_by || "Not assigned"}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>Activities</span>
                    <span>{activities.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Communications</span>
                    <span>{communications.length}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button variant="outline" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    View History
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/crm/activities/new?doctype=Lead&name=${lead.name}`)}
                  >
                    <ListTodo className="w-4 h-4 mr-2" />
                    Add Activity
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/crm/opportunities/new?lead=${lead.name}`)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Opportunity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}