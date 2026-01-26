"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  Folder,
  Target,
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
import type { CostCenter } from "@/types/doctype-types";
import { Badge } from "@/components/ui/badge";

interface CostCenterNode extends CostCenter {
  children: CostCenterNode[];
}

interface CostCenterTreeProps {
  costCenters: CostCenter[];
  onAddSub?: (parent: CostCenter) => void;
  onEdit?: (costCenter: CostCenter) => void;
}

export function CostCenterTree({
  costCenters,
  onAddSub,
  onEdit,
}: CostCenterTreeProps) {
  const tree = useMemo(() => {
    const map: Record<string, CostCenterNode> = {};
    const roots: CostCenterNode[] = [];

    costCenters.forEach((cc) => {
      map[cc.name] = { ...cc, children: [] };
    });

    costCenters.forEach((cc) => {
      const node = map[cc.name];
      if (cc.parent_cost_center && map[cc.parent_cost_center]) {
        map[cc.parent_cost_center].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [costCenters]);

  if (costCenters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-[2.5rem] bg-card/30 backdrop-blur-sm">
        <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-bold text-muted-foreground">
          No cost centers found
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
          onAddSub={onAddSub}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  onAddSub,
  onEdit,
}: {
  node: CostCenterNode;
  depth: number;
  onAddSub?: (parent: CostCenter) => void;
  onEdit?: (account: CostCenter) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const isGroup = node.is_group === 1;

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group cursor-pointer",
          "hover:bg-emerald-500/5 active:bg-emerald-500/10",
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
              ? "bg-emerald-500/10 text-emerald-600 shadow-emerald-500/5"
              : "bg-sky-500/10 text-sky-600 shadow-sky-500/5",
          )}
        >
          {isGroup ? (
            <Folder className="w-4 h-4" />
          ) : (
            <Target className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate group-hover:text-emerald-600 transition-colors">
              {node.cost_center_name}
            </p>
            {node.cost_center_number && (
              <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">
                ({node.cost_center_number})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
          {isGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddSub?.(node);
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
                className="h-8 w-8 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors"
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
                <Plus className="w-4 h-4 mr-2" /> Edit Cost Center
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
            <div
              className="absolute left-[1.35rem] top-0 bottom-4 w-px bg-emerald-500/20"
              style={{ marginLeft: `${depth * 24}px` }}
            />
            {node.children.map((child) => (
              <TreeNode
                key={child.name}
                node={child}
                depth={depth + 1}
                onAddSub={onAddSub}
                onEdit={onEdit}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
