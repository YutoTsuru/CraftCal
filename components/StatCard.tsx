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
      // モバイルでは余白と数字を少し小さくして、狭い幅でもカードが間延びしないようにする (Issue #37)
      className="rounded-3xl border border-stone-200 bg-surface p-4 shadow-md md:p-5"
    >
      <p className="text-sm text-stone-700">{label}</p>
      <p className="mt-2 text-2xl font-bold md:mt-3 md:text-3xl">{value}</p>
      {/* 補足説明はモバイルでは非表示（3列に並べたとき窮屈になるため） */}
      {description && <p className="mt-2 hidden text-sm text-stone-600 md:block">{description}</p>}
    </motion.div>
  );
}
