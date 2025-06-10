'use client';

import React, {useState, useEffect} from 'react';
import ProductManager, {Product} from '../components/ProductManager';
import TransactionManager, {Transaction} from '../components/TransactionManager';
import StockView from '../components/StockView';
import Reports from '../components/Reports';
import ExportData from '../components/ExportData';
import SearchFilter from '../components/SearchFilter';

export default function Home() {
 const [products, setProducts] = useState<Product[]>([]);
 const [transactions, setTransactions] = useState<Transaction[]>([]);
 const [searchTerm, setSearchTerm] = useState<string>('');

 // Load data from localStorage on mount
 useEffect(() => {
  const storedProducts = JSON.parse(localStorage.getItem('products') ?? '[]') as Product[];
  const storedTransactions = JSON.parse(localStorage.getItem('transactions') ?? '[]') as Transaction[];
  setProducts(storedProducts);
  setTransactions(storedTransactions);
 }, []);

 // Save products to localStorage on change
 useEffect(() => {
  localStorage.setItem('products', JSON.stringify(products));
 }, [products]);

 // Save transactions to localStorage on change
 useEffect(() => {
  localStorage.setItem('transactions', JSON.stringify(transactions));
 }, [transactions]);

 // Filter products by search term
 const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()));

 return (
  <main className="min-h-screen bg-white text-black p-6 max-w-7xl mx-auto space-y-10">
   <h1 className="text-4xl font-extrabold mb-8 tracking-tight">Lie ce - Stock & Sales Management</h1>
   <SearchFilter
    searchTerm={searchTerm}
    setSearchTerm={setSearchTerm}
   />
   <ProductManager
    products={filteredProducts}
    setProducts={setProducts}
   />
   <TransactionManager
    products={products}
    transactions={transactions}
    setTransactions={setTransactions}
    setProducts={setProducts}
   />
   <StockView products={products} />
   <Reports
    transactions={transactions}
    products={products}
   />
   <ExportData
    transactions={transactions}
    products={products}
   />
  </main>
 );
}
