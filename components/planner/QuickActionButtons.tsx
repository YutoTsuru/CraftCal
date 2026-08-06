"use client";

import { motion } from "framer-motion";

const quickActions = [
  "今日の予定を組む",
  "明日の空き時間で組む",
  "軽めのタスクだけ",
  "締切が近い順",
  "1時間以内でできる作業"
];

type Props = {
  onPick: (value: string) => void;
};

export function QuickActionButtons({ onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {quickActions.map((action, index) => (
        <motion.button
          key={action}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => onPick(action)}
          className="rounded-full border border-lime-200 bg-lime-50 px-4 py-2 text-sm font-medium text-lime-800 transition hover:border-lime-300 hover:bg-lime-100"
        >
          {action}
        </motion.button>
      ))}
    </div>
  );
}
