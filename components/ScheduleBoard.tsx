"use client";

import { motion } from "framer-motion";
import { getDayPoint } from "@/lib/schedule";
import type { ScheduleDay } from "@/types/dev-calendar";

export function ScheduleBoard({ schedule }: { schedule: ScheduleDay[] }) {
  if (schedule.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-700">
        スプリントを生成すると、ここに日別スケジュールが表示されます。
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {schedule.map((day, index) => (
        <motion.section
          key={day.date}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{day.date}</h3>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700">
              {getDayPoint(day)} pt
            </span>
          </div>

          {day.tasks.length === 0 ? (
            <p className="text-sm text-slate-500">タスクなし</p>
          ) : (
            <div className="grid gap-2">
              {day.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{task.weight} / {task.status}</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      ))}
    </div>
  );
}
