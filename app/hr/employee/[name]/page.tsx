"use client";

// app/hr/employee/[name]/page.tsx
// Employee Detail — InfoCard grid. OKLCH semantic tokens only.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  ArrowLeft,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/types/doctype-types";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(emp: Employee): string {
  const first = emp.first_name?.charAt(0) || "";
  const last = emp.last_name?.charAt(0) || "";
  return `${first}${last}`.toUpperCase() || "NA";
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

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

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div className="lg:col-span-2 space-y-6" variants={fadeIn}>
          <InfoCard
            title="Personal Information"
            icon={<User className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataPoint label="First Name" value={emp.first_name} />
              <DataPoint label="Middle Name" value={emp.middle_name || "—"} />
              <DataPoint label="Last Name" value={emp.last_name || "—"} />
              <DataPoint label="Gender" value={emp.gender} />
              <DataPoint
                label="Date of Birth"
                value={formatDate(emp.date_of_birth)}
              />
              <DataPoint label="Blood Group" value={emp.blood_group || "—"} />
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
                value={formatDate(emp.date_of_joining)}
              />
              <DataPoint label="Branch" value={emp.branch || "—"} />
              <DataPoint label="Reports To" value={emp.reports_to || "—"} />
            </div>
          </InfoCard>

          <InfoCard
            title="Contact Information"
            icon={<Phone className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataPoint label="Mobile" value={emp.cell_number || "—"} />
              <DataPoint
                label="Personal Email"
                value={emp.personal_email || "—"}
              />
              <DataPoint
                label="Company Email"
                value={emp.company_email || "—"}
              />
              <DataPoint
                label="Preferred Email"
                value={emp.prefered_contact_email || "—"}
              />
            </div>
          </InfoCard>

          <InfoCard
            title="Address"
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DataPoint
                label="Current Address"
                value={emp.current_address || "—"}
              />
              <DataPoint
                label="Permanent Address"
                value={emp.permanent_address || "—"}
              />
            </div>
          </InfoCard>
        </motion.div>

        <motion.div className="space-y-6" variants={fadeIn}>
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
                  {formatDate(emp.date_of_joining)}
                </span>
              </div>
              {emp.reports_to && (
                <div className="flex items-center justify-between text-sm pt-4 border-t border-primary/10">
                  <span className="text-muted-foreground">Reports To</span>
                  <span className="font-medium truncate max-w-[120px]">
                    {emp.reports_to}
                  </span>
                </div>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Contact Details" variant="gradient">
            <div className="space-y-3">
              {emp.cell_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{emp.cell_number}</span>
                </div>
              )}
              {emp.personal_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground truncate">
                    {emp.personal_email}
                  </span>
                </div>
              )}
              {emp.company_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground truncate">
                    {emp.company_email}
                  </span>
                </div>
              )}
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
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Employee Number</span>
                <span className="text-foreground font-mono">
                  {emp.employee_number || "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-border/50 pt-2">
                <span className="text-muted-foreground">System Created</span>
                <span className="text-foreground">
                  {emp.creation
                    ? new Date(emp.creation).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </InfoCard>
        </motion.div>
      </motion.div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Employee"
        description={`Are you sure you want to delete "${emp.employee_name || emp.name}"? This action cannot be undone.`}
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
