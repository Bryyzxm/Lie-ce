"use client";

import React from "react";

interface Transaction {
  id: string;
  date: string;
  productId: string;
  quantity: number;
  total: number;
}

interface ExportDataProps {
  transactions: Transaction[];
}

export default function ExportData({ transactions }: ExportDataProps) {
  // Convert transactions to CSV string
  const convertToCSV = () => {
    const headers = ["ID", "Date", "Product ID", "Quantity", "Total"];
    const rows = transactions.map((tx) => [
      tx.id,
      tx.date,
      tx.productId,
      tx.quantity.toString(),
      tx.total.toString(),
    ]);
    const csvContent =
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    return csvContent;
  };

  // Trigger download of CSV file
  const handleExport = () => {
    const csv = convertToCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sales_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="mb-8">
      <button
        onClick={handleExport}
        className="bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold"
      >
        Export Sales Data to CSV
      </button>
    </section>
  );
}
