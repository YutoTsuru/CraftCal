"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, Home, Rocket, Folder } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/sprint", label: "Sprint", icon: Rocket },
  { href: "/today", label: "Today", icon: CalendarDays }
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:flex">
      {/* Decorative visuals: grid + moving blobs (non-interactive) */}
      <div className="bg-visuals" aria-hidden>
        <div className="bg-grid" />
        <div className="blob blob--a" />
        <div className="blob blob--b" />
        <div className="blob blob--c" />
      </div>

      <aside className="hidden lg:block border-b border-slate-200 bg-white px-3 py-3 lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:border-b-0 lg:border-r">
        <div className="mb-6">
            <Link href="/" className="block">
            <h1 className="text-2xl font-bold tracking-tight">CraftCal</h1>
          </Link>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* mobile top nav */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-indigo-600">CraftCal</Link>
          <nav className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} />
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="w-full px-4 py-6 lg:ml-56 lg:px-8 lg:py-8 content-above">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mx-auto max-w-6xl"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
