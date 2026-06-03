// app/sales/settings/project/[name]/page.tsx
// Obsidian ERP v4.0 - Project Detail View
// @ts-nocheck

"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Layout,
  Edit,
  Trash2,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  Clock,
  ArrowLeft,
  PieChart,
  BarChart3,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Project } from "@/types/doctype-types";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: project,
    isLoading,
    error,
  } = useFrappeDoc<Project>("Project", name);

  const deleteMutation = useFrappeDelete("Project", {
    onSuccess: () => {
      toast.success("Project deleted successfully");
      router.push("/sales/settings/project");
    },
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Layout className="h-10 w-10 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Project Not Found</h2>
          <p className="text-muted-foreground">
            The project you are looking for does not exist or has been deleted.
          </p>
        </div>
        <Button
          onClick={() => router.push("/sales/settings/project")}
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const statusColors = {
    Open: "bg-blue-100 text-blue-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-slate-100 text-slate-700",
  };

  const priorityColors = {
    Low: "bg-slate-100 text-slate-700",
    Medium: "bg-orange-100 text-orange-700",
    High: "bg-rose-100 text-rose-700",
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={project.project_name}
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-muted-foreground">
              {project.name}
            </span>
            <Badge
              className={cn(
                "rounded-full border-0 text-[10px] font-bold px-2",
                statusColors[project.status] || statusColors.Open,
              )}
            >
              {project.status || "Open"}
            </Badge>
          </div>
        }
        backHref="/sales/settings/project"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/sales/sales-order/new?project=${encodeURIComponent(project.name)}`,
                )
              }
            >
              <ShoppingCart className="h-4 w-4 mr-2" /> Create Order
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(
                  `/sales/settings/project/${encodeURIComponent(name)}/edit`,
                )
              }
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="outline"
              className="rounded-full text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Progress Section */}
          <InfoCard
            title="Project Progress"
            icon={<PieChart className="h-5 w-5 text-primary" />}
          >
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                    Overall Completion
                  </p>
                  <h2 className="text-4xl font-black text-primary tracking-tight">
                    {project.percent_complete || 0}%
                  </h2>
                </div>
                <div className="text-right">
                  <Badge
                    className={cn(
                      "rounded-full border-0 px-3",
                      priorityColors[project.priority] || priorityColors.Medium,
                    )}
                  >
                    {project.priority || "Medium"} Priority
                  </Badge>
                </div>
              </div>

              <div className="w-full h-4 bg-secondary rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out relative"
                  style={{ width: `${project.percent_complete || 0}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-border/10">
                <DataPoint
                  label="Method"
                  value={project.percent_complete_method || "Manual"}
                />
                <DataPoint
                  label="Type"
                  value={project.project_type || "Standard"}
                />
                <DataPoint
                  label="Is Active"
                  value={project.is_active || "Yes"}
                />
                <DataPoint
                  label="Department"
                  value={project.department || "General"}
                />
              </div>
            </div>
          </InfoCard>

          {/* Details Section */}
          <InfoCard
            title="Timeline & Schedule"
            icon={<Calendar className="h-5 w-5 text-primary" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/50">
                <div className="p-3 rounded-xl bg-background shadow-sm">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">
                    Expected Start
                  </p>
                  <p className="text-lg font-bold">
                    {formatDate(project.expected_start_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/50">
                <div className="p-3 rounded-xl bg-background shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">
                    Expected Deadline
                  </p>
                  <p className="text-lg font-bold">
                    {formatDate(project.expected_end_date)}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 pt-4 border-t border-border/10">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">
                  Actual Time Tracking
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1 px-1">
                    <p className="text-xs text-muted-foreground">
                      Timesheet Hours
                    </p>
                    <p className="text-base font-bold text-foreground font-mono">
                      {project.actual_time || 0} hrs
                    </p>
                  </div>
                  <div className="space-y-1 px-1">
                    <p className="text-xs text-muted-foreground">
                      Actual Start
                    </p>
                    <p className="text-base font-bold text-foreground">
                      {formatDate(project.actual_start_date)}
                    </p>
                  </div>
                  <div className="space-y-1 px-1">
                    <p className="text-xs text-muted-foreground">Actual End</p>
                    <p className="text-base font-bold text-foreground">
                      {formatDate(project.actual_end_date)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Notes Section */}
          {project.notes && (
            <InfoCard
              title="Project Notes"
              icon={<Layout className="h-5 w-5 text-primary" />}
            >
              <div className="p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground italic bg-secondary/10 p-4 rounded-xl border-l-4 border-primary/30">
                  {project.notes}
                </div>
              </div>
            </InfoCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <InfoCard title="Stakeholders" variant="gradient">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Client / Customer
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <p className="text-lg font-black text-white">
                      {project.customer || "Internal Project"}
                    </p>
                    {project.customer && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-white/70 hover:text-white"
                        onClick={() =>
                          router.push(
                            `/crm/customer/${encodeURIComponent(project.customer)}`,
                          )
                        }
                      >
                        View Customer Profile{" "}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Building2 className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Executing Company
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground/80 pl-6">
                    {project.company}
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="Project Financials"
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Estimated Costing
                </span>
                <span className="font-bold font-mono">
                  {project.estimated_costing || 0} ETB
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Actual Costing
                </span>
                <span className="font-bold font-mono">
                  {project.total_costing_amount || 0} ETB
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">
                  Sales Amount
                </span>
                <span className="font-black text-primary font-mono">
                  {project.total_sales_amount || 0} ETB
                </span>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  Gross Margin
                </p>
                <div className="flex justify-between items-end">
                  <p className="text-2xl font-black">
                    {project.per_gross_margin || 0}%
                  </p>
                  <p className="text-sm font-bold text-primary/80">
                    {project.gross_margin || 0} ETB
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={() => deleteMutation.mutate(project.name)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
