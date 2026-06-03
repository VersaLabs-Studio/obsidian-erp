// components/smart/print-label-dialog.tsx
// Obsidian ERP v4.0 - Print Label Dialog Component

"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Printer, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelData {
  /** Item code / Barcode */
  code: string;
  /** Item name */
  name: string;
  /** Price (optional) */
  price?: number;
  /** Currency symbol */
  currency?: string;
  /** Additional info line */
  additionalInfo?: string;
}

interface PrintLabelDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Label data to print */
  data: LabelData;
}

type LabelSize = "small" | "medium" | "large";

const labelSizes = {
  small: { width: 160, height: 80, name: "Small (4cm x 2cm)" },
  medium: { width: 240, height: 120, name: "Medium (6cm x 3cm)" },
  large: { width: 320, height: 160, name: "Large (8cm x 4cm)" },
};

/**
 * PrintLabelDialog - Print Label Preview and Print Dialog
 *
 * @example
 * ```tsx
 * <PrintLabelDialog
 *   open={showPrint}
 *   onOpenChange={setShowPrint}
 *   data={{
 *     code: "ITEM-001",
 *     name: "Product Name",
 *     price: 99.99,
 *     currency: "ETB",
 *   }}
 * />
 * ```
 */
export function PrintLabelDialog({
  open,
  onOpenChange,
  data,
}: PrintLabelDialogProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const size = labelSizes[labelSize];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print labels");
      return;
    }

    // Generate labels for the number of copies
    let labelsHtml = "";
    for (let i = 0; i < copies; i++) {
      labelsHtml += `
        <div style="
          width: ${size.width}px;
          height: ${size.height}px;
          border: 1px solid #e5e7eb;
          padding: 8px;
          margin: 4px;
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: 'Inter', system-ui, sans-serif;
          page-break-inside: avoid;
        ">
          <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
            ${data.code}
          </div>
          <div style="
            font-size: ${
              labelSize === "small"
                ? "12px"
                : labelSize === "medium"
                ? "14px"
                : "16px"
            };
            font-weight: 700;
            text-align: center;
            line-height: 1.2;
            margin-bottom: 4px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${data.name}
          </div>
          ${
            showPrice && data.price
              ? `<div style="font-size: ${
                  labelSize === "small" ? "14px" : "18px"
                }; font-weight: 800; color: #2563eb;">
                  ${data.currency || "ETB"} ${data.price.toFixed(2)}
                </div>`
              : ""
          }
          ${
            data.additionalInfo
              ? `<div style="font-size: 9px; color: #9ca3af; margin-top: 4px;">${data.additionalInfo}</div>`
              : ""
          }
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Labels - ${data.name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 8px; }
              @page { margin: 0.5cm; }
            }
            body {
              font-family: 'Inter', system-ui, sans-serif;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 8px;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-0 shadow-2xl bg-popover/95 backdrop-blur-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Label
          </DialogTitle>
          <DialogDescription>
            Preview and print labels for this item
          </DialogDescription>
        </DialogHeader>

        {/* Label Preview */}
        <div className="flex justify-center py-6 bg-secondary/30 rounded-2xl">
          <div
            ref={printRef}
            className="bg-card border border-border rounded-lg shadow-sm flex flex-col items-center justify-center p-3"
            style={{
              width: size.width,
              height: size.height,
            }}
          >
            <span className="text-[10px] text-muted-foreground font-mono">
              {data.code}
            </span>
            <span
              className={cn(
                "font-bold text-center leading-tight my-1 max-w-full truncate px-2",
                labelSize === "small"
                  ? "text-xs"
                  : labelSize === "medium"
                  ? "text-sm"
                  : "text-base"
              )}
            >
              {data.name}
            </span>
            {showPrice && data.price && (
              <span
                className={cn(
                  "font-extrabold text-primary",
                  labelSize === "small" ? "text-sm" : "text-lg"
                )}
              >
                {data.currency || "ETB"} {data.price.toFixed(2)}
              </span>
            )}
            {data.additionalInfo && (
              <span className="text-[9px] text-muted-foreground mt-1">
                {data.additionalInfo}
              </span>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Label Size</Label>
            <Select
              value={labelSize}
              onValueChange={(v) => setLabelSize(v as LabelSize)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(labelSizes).map(([key, val]) => (
                  <SelectItem key={key} value={key} className="rounded-lg">
                    {val.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of Copies</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showPrice"
            checked={showPrice}
            onChange={(e) => setShowPrice(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="showPrice" className="text-sm cursor-pointer">
            Show price on label
          </Label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            className="rounded-full px-6 shadow-lg shadow-primary/25"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {copies > 1 ? `${copies} Labels` : "Label"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PrintLabelDialog;
