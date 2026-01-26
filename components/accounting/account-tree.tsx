"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  Folder,
  FileText,
  Plus,
  MoreVertical,
  ExternalLink,
  History,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import type { Account } from "@/types/doctype-types";
import { Badge } from "@/components/ui/badge";

interface AccountNode extends Account {
  children: AccountNode[];
}

interface AccountTreeProps {
  accounts: Account[];
  onAddSubAccount?: (parent: Account) => void;
  onViewLedger?: (account: Account) => void;
  onEdit?: (account: Account) => void;
}

export function AccountTree({
  accounts,
  onAddSubAccount,
  onViewLedger,
  onEdit,
}: AccountTreeProps) {
  const tree = useMemo(() => {
    const map: Record<string, AccountNode> = {};
    const roots: AccountNode[] = [];

    // Create a map of all accounts
    accounts.forEach((acc) => {
      map[acc.name] = { ...acc, children: [] };
    });

    // Build the tree structure
    accounts.forEach((acc) => {
      const node = map[acc.name];
      if (acc.parent_account && map[acc.parent_account]) {
        map[acc.parent_account].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [accounts]);

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-[2.5rem] bg-card/30 backdrop-blur-sm">
        <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-bold text-muted-foreground">
          No accounts found
        </p>
        <p className="text-sm text-muted-foreground/60">
          Select a company or create a new chart of accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-4">
      {tree.map((node) => (
        <TreeNode
          key={node.name}
          node={node}
          depth={0}
          onAddSubAccount={onAddSubAccount}
          onViewLedger={onViewLedger}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onAddSubAccount,
  onViewLedger,
  onEdit,
}: {
  node: AccountNode;
  depth: number;
  onAddSubAccount?: (parent: Account) => void;
  onViewLedger?: (account: Account) => void;
  onEdit?: (account: Account) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 1); // Expand first level by default
  const isGroup = node.is_group === 1;

  const getAccountTypeColor = (type?: string) => {
    switch (type) {
      case "Asset":
        return "bg-sky-500/10 text-sky-600 border-sky-500/20";
      case "Liability":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "Equity":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "Income":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Expense":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-secondary/50 text-muted-foreground border-transparent";
    }
  };

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group cursor-pointer",
          "hover:bg-primary/5 active:bg-primary/10",
          node.disabled === 1 && "opacity-50",
        )}
        style={{ marginLeft: `${depth * 24}px` }}
        onClick={() => isGroup && setIsOpen(!isOpen)}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {isGroup && (
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{
                duration: 0.3,
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          )}
        </div>

        <div
          className={cn(
            "p-2 rounded-xl transition-all duration-300 shadow-sm",
            isGroup
              ? "bg-amber-500/10 text-amber-600 shadow-amber-500/5"
              : "bg-primary/10 text-primary shadow-primary/5",
          )}
        >
          {isGroup ? (
            <Folder className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
              {node.account_name}
            </p>
            {node.account_number && (
              <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">
                ({node.account_number})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {node.root_type && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0 h-4 border",
                  getAccountTypeColor(node.root_type),
                )}
              >
                {node.root_type}
              </Badge>
            )}
            {node.account_type && (
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider opacity-60">
                • {node.account_type}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
          {isGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-primary/15 hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubAccount?.(node);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-primary/15 hover:text-primary transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl border-border/50 shadow-xl backdrop-blur-md bg-card/80"
            >
              <DropdownMenuItem
                onClick={() => onEdit?.(node)}
                className="rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> Edit Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewLedger?.(node)}
                className="rounded-xl"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> View Ledger
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && isGroup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden relative"
          >
            {/* Thread Line */}
            <div
              className="absolute left-[1.35rem] top-0 bottom-4 w-px bg-border/40"
              style={{ marginLeft: `${depth * 24}px` }}
            />

            {node.children.map((child) => (
              <TreeNode
                key={child.name}
                node={child}
                depth={depth + 1}
                onAddSubAccount={onAddSubAccount}
                onViewLedger={onViewLedger}
                onEdit={onEdit}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
