"use client";

import { useParams, useRouter } from "next/navigation";
import {
  User,
  Briefcase,
  Building2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/types/doctype-types";
import { useState } from "react";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: emp,
    isLoading,
    error,
  } = useFrappeDoc<Employee>("Employee", name);

  const deleteMutation = useFrappeDelete("Employee", {
    onSuccess: () => router.push("/hr/employee"),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !emp)
    return (
      <div className="p-8 text-center text-destructive">Employee not found</div>
    );

  const statusVariant = emp.status === "Active" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <PageHeader
        title={emp.employee_name || emp.name}
        subtitle={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className="rounded-full">
              {emp.status}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {emp.name}
            </span>
          </div>
        }
        backHref="/hr/employee"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                router.push(`/hr/employee/${encodeURIComponent(name)}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InfoCard
            title="Personal Information"
            icon={<User className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataPoint label="First Name" value={emp.first_name} />
              <DataPoint label="Last Name" value={emp.last_name || "N/A"} />
              <DataPoint label="Gender" value={emp.gender} />
              <DataPoint
                label="Date of Birth"
                value={
                  emp.date_of_birth
                    ? new Date(emp.date_of_birth).toLocaleDateString()
                    : "Not set"
                }
              />
            </div>
          </InfoCard>

          <InfoCard
            title="Employment Details"
            icon={<Briefcase className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataPoint label="Company" value={emp.company} />
              <DataPoint
                label="Department"
                value={emp.department || "No Department"}
              />
              <DataPoint
                label="Designation"
                value={emp.designation || "No Designation"}
              />
              <DataPoint
                label="Date of Joining"
                value={
                  emp.date_of_joining
                    ? new Date(emp.date_of_joining).toLocaleDateString()
                    : "Not set"
                }
              />
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard title="Quick Status" variant="gradient">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Work Status</span>
                <span className="flex items-center gap-1 font-medium italic">
                  {emp.status === "Active" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {emp.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-4 border-t border-primary/10">
                <span className="text-muted-foreground">Join Date</span>
                <span className="font-medium">
                  {emp.date_of_joining
                    ? new Date(emp.date_of_joining).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="System Metadata"
            icon={<ShieldCheck className="h-4 w-4" />}
            variant="transparent"
            className="p-0"
          >
            <div className="space-y-3 px-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="text-foreground font-mono">{emp.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">User Account</span>
                <span className="text-foreground truncate max-w-[120px]">
                  {emp.user_id || "None"}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-border/50 pt-2">
                <span className="text-muted-foreground">System Created</span>
                <span className="text-foreground">
                  {new Date(emp.creation!).toLocaleDateString()}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Employee"
        description={`Are you sure you want to delete "${emp.employee_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={async () => {
          await deleteMutation.mutateAsync(name);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
