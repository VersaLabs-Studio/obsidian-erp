// lib/export-utils.ts

// Generic type for export data
export interface ExportableItem {
  [key: string]: any;
}

// CSV Export Function
export function exportToCSV<T extends ExportableItem>(
  data: T[],
  filename: string,
  headers?: { [key: string]: string },
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get all keys from the first item to use as columns
  const keys = Object.keys(data[0]);

  // Create header row
  const headerRow = keys.map((key) => headers?.[key] || key).join(",");

  // Create data rows
  const dataRows = data.map((item) =>
    keys
      .map((key) => {
        const value = item[key];
        // Handle values that might contain commas or quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(","),
  );

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join("\n");

  // Create a blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// PDF Export Function (using jsPDF)
export async function exportToPDF<T extends ExportableItem>(
  data: T[],
  filename: string,
  title: string,
  headers?: { [key: string]: string },
): Promise<void> {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get all keys from the first item to use as columns
  const keys = Object.keys(data[0]);

  // Create header row
  const headerRow = keys.map((key) => headers?.[key] || key);

  // Create data rows
  const dataRows = data.map((item) =>
    keys.map((key) => {
      const value = item[key];
      // Convert to string and handle null/undefined
      return value !== null && value !== undefined ? String(value) : "";
    }),
  );

  // Create PDF document
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Add date
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  // Add table
  autoTable(doc, {
    head: [headerRow],
    body: dataRows,
    startY: 40,
    theme: "striped",
    headStyles: { fillColor: [66, 66, 66] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 }, // Adjust column widths as needed
    },
  });

  // Save the PDF
  doc.save(`${filename}.pdf`);
}

// Export dialog component
export function getExportOptions(
  data: any[],
  filename: string,
  title: string,
  headers?: { [key: string]: string },
) {
  return {
    csv: () => exportToCSV(data, filename, headers),
    pdf: () => exportToPDF(data, filename, title, headers),
  };
}
