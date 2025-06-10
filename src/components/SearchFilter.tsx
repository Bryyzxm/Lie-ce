"use client";

import React from "react";

interface SearchFilterProps {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

export default function SearchFilter({ searchTerm, setSearchTerm }: SearchFilterProps) {
  return (
    <section className="mb-6">
      <input
        type="text"
        placeholder="Search products by name or code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full border border-gray-300 rounded p-2"
      />
    </section>
  );
}
