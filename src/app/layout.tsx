import React from 'react';
import './tailwind.css';

export const metadata = {
 title: 'Lie-ce',
 description: 'Lie-ce Application',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
 return (
  <html lang="en">
   <body>{children}</body>
  </html>
 );
}
