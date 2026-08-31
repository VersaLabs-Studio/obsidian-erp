// app/crm/contact/page.tsx
// Obsidian ERP v4.0 - Contacts List Page
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { Contact } from "@/types/doctype-types";
import { ListErrorState } from "@/components/ui/list-error-state";

// Contact Row Component
function ContactRow({
  contact,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Extract linked entity name for display
  const linkedEntity =
    contact.links && contact.links.length > 0
      ? (contact.links[0] as { link_doctype: string; link_name: string })
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex items-start justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer"
      onClick={onView}
    >
      {/* Contact Info */}
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {contact.full_name ||
                `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
                "Unnamed Contact"}
            </h3>
            {contact.is_primary_contact === 1 && (
              <Badge variant="default" className="text-xs">
                Primary
              </Badge>
            )}
          </div>

          {contact.designation && (
            <div className="text-sm text-muted-foreground mb-1">
              {contact.designation}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {contact.email_id && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[150px]">
                  {contact.email_id}
                </span>
              </div>
            )}
            {contact.mobile_no && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{contact.mobile_no}</span>
              </div>
            )}
          </div>

          {linkedEntity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Building2 className="h-3 w-3" />
              <span>
                {linkedEntity.link_doctype}: {linkedEntity.link_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-xl border-none shadow-xl bg-popover/95 backdrop-blur-xl p-1"
        >
          <DropdownMenuItem
            className="rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="rounded-lg text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

// Main Page Component
export default function ContactsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  // Fetch contacts
  const {
    data: contacts,
    isLoading,
    error,
  } = useFrappeList<Contact>("Contact", {
    orderBy: { field: "`tabContact`.creation", order: "desc" },
    search,
    limit: 100,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Contact", {
    onSuccess: () => setDeleteTarget(null),
  });

  // Filter
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    let result = contacts;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(searchLower) ||
          c.first_name?.toLowerCase().includes(searchLower) ||
          c.last_name?.toLowerCase().includes(searchLower) ||
          c.email_id?.toLowerCase().includes(searchLower),
      );
    }

    return result;
  }, [contacts, search]);

  // Handlers
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState type="list" count={6} />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <ListErrorState error={error} label="contacts" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle={`${filteredContacts.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search contacts..."
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/contact/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> New Contact
          </Button>
        }
      />

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          title="No contacts found"
          description={
            search
              ? "Try adjusting your search"
              : "Create your first contact to get started"
          }
          action={
            <Button onClick={() => router.push("/crm/contact/new")}>
              <Plus className="h-4 w-4 mr-2" /> New Contact
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact, index) => (
            <ContactRow
              key={contact.name}
              contact={contact}
              index={index}
              onView={() =>
                router.push(`/crm/contact/${encodeURIComponent(contact.name)}`)
              }
              onEdit={() =>
                router.push(
                  `/crm/contact/${encodeURIComponent(contact.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(contact)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Contact"
        description={`Are you sure you want to delete "${deleteTarget?.full_name || deleteTarget?.first_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
