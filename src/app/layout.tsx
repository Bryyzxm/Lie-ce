import React from 'react';
import './globals.css';

export const metadata = {
 title: 'Lie-ce',
 description: 'Lie-ce Application',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return (
  <html lang="en">
   <body>{children}</body>
  </html>
 );
}
