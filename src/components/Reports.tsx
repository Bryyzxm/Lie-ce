'use client';

import React from 'react';

interface Transaction {
 id: string;
 date: string;
 productId: string;
 quantity: number;
 total: number;
}

interface Product {
 id: string;
 name: string;
 price: number;
 modalPrice: number;
}

interface ReportsProps {
 transactions: Transaction[];
 products: Product[];
}

function calculateProfit(transaction: Transaction, products: Product[]) {
 const product = products.find((p) => p.id === transaction.productId);
 if (!product) return 0;
 return (product.price - product.modalPrice) * transaction.quantity;
}

function sumTransactions(transactions: Transaction[]) {
 return transactions.reduce((acc, tx) => acc + tx.total, 0);
}

function sumProfits(transactions: Transaction[], products: Product[]) {
 return transactions.reduce((acc, tx) => acc + calculateProfit(tx, products), 0);
}

function filterByDateRange(transactions: Transaction[], start: Date, end: Date) {
 return transactions.filter((tx) => {
  const txDate = new Date(tx.date);
  return txDate >= start && txDate <= end;
 });
}

export default function Reports({transactions, products}: ReportsProps) {
 const now = new Date();

 // Daily: today
 const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 const dailyTx = filterByDateRange(transactions, startOfDay, now);
 const dailyTotal = sumTransactions(dailyTx);
 const dailyProfit = sumProfits(dailyTx, products);

 // Weekly: last 7 days
 const startOfWeek = new Date(now);
 startOfWeek.setDate(now.getDate() - 6);
 const weeklyTx = filterByDateRange(transactions, startOfWeek, now);
 const weeklyTotal = sumTransactions(weeklyTx);
 const weeklyProfit = sumProfits(weeklyTx, products);

 // Monthly: current month
 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
 const monthlyTx = filterByDateRange(transactions, startOfMonth, now);
 const monthlyTotal = sumTransactions(monthlyTx);
 const monthlyProfit = sumProfits(monthlyTx, products);

 return (
  <section className="mb-8">
   <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Sales Reports</h2>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <div className="p-6 border rounded-lg shadow-md bg-gray-50 flex flex-col items-center">
     <h3 className="text-lg font-semibold mb-3">Daily Sales</h3>
     <p className="text-3xl font-extrabold">Rp {dailyTotal.toLocaleString()}</p>
     <p className="text-sm text-gray-600 mt-1">{dailyTx.length} transactions</p>
     <p className="text-lg text-green-600 mt-2">Profit: Rp {dailyProfit.toLocaleString()}</p>
    </div>
    <div className="p-6 border rounded-lg shadow-md bg-gray-50 flex flex-col items-center">
     <h3 className="text-lg font-semibold mb-3">Weekly Sales</h3>
     <p className="text-3xl font-extrabold">Rp {weeklyTotal.toLocaleString()}</p>
     <p className="text-sm text-gray-600 mt-1">{weeklyTx.length} transactions</p>
     <p className="text-lg text-green-600 mt-2">Profit: Rp {weeklyProfit.toLocaleString()}</p>
    </div>
    <div className="p-6 border rounded-lg shadow-md bg-gray-50 flex flex-col items-center">
     <h3 className="text-lg font-semibold mb-3">Monthly Sales</h3>
     <p className="text-3xl font-extrabold">Rp {monthlyTotal.toLocaleString()}</p>
     <p className="text-sm text-gray-600 mt-1">{monthlyTx.length} transactions</p>
     <p className="text-lg text-green-600 mt-2">Profit: Rp {monthlyProfit.toLocaleString()}</p>
    </div>
   </div>
  </section>
 );
}
