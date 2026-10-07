import React from 'react';
import Navbar from './Navbar';
import DistractionNotification from './DistractionNotification';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/20 to-stone-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 text-stone-900 dark:text-stone-100 antialiased font-sans">
      <Navbar />
      <DistractionNotification />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
