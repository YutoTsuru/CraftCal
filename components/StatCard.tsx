"use client";

import { motion } from "framer-motion";

type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
};

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md"
    >
      <p className="text-sm text-slate-700">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
    </motion.div>
  );
}
