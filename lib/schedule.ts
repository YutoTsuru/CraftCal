import type { ScheduleDay, Sprint, Task, TaskWeight } from "@/types/dev-calendar";

const weightPointMap: Record<TaskWeight, number> = {
  light: 1,
  medium: 2,
  heavy: 3
};

export function getTaskWeightPoint(weight: TaskWeight) {
  return weightPointMap[weight];
}

export function getDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function generateSchedule(tasks: Task[], sprint: Sprint | null): ScheduleDay[] {
  if (!sprint) {
    return [];
  }

  const dates = getDateRange(sprint.startDate, sprint.endDate);

  if (dates.length === 0) {
    return [];
  }

  const days = dates.map((date) => ({
    date,
    tasks: [] as Task[]
  }));

  const activeTasks = tasks.filter((task) => task.status !== "done");

  // First, place tasks that already have scheduledDate within sprint
  const scheduled = activeTasks.filter((t) => t.scheduledDate && dates.includes(t.scheduledDate));
  scheduled.forEach((task) => {
    const day = days.find((d) => d.date === task.scheduledDate);
    if (day) {
      day.tasks.push(task);
    }
  });

  // Remaining tasks: those not already scheduled
  const remaining = activeTasks.filter((t) => !t.scheduledDate || !dates.includes(t.scheduledDate));

  // Sort by weight (descending)
  remaining.sort((a, b) => getTaskWeightPoint(b.weight) - getTaskWeightPoint(a.weight));

  remaining.forEach((task) => {
    const targetDay = days.reduce((leastLoadedDay, currentDay) => {
      return getDayPoint(currentDay) < getDayPoint(leastLoadedDay) ? currentDay : leastLoadedDay;
    }, days[0]);

    targetDay.tasks.push(task);
  });

  return days;
}

export function getDayPoint(day: ScheduleDay) {
  return day.tasks.reduce((total, task) => total + getTaskWeightPoint(task.weight), 0);
}

export function getTodayString() {
  return formatDate(new Date());
}

export function getTodayTasks(schedule: ScheduleDay[], allTasks?: Task[]) {
  const today = getTodayString();

  // From generated schedule (sprint)
  const fromSchedule = schedule.find((day) => day.date === today)?.tasks ?? [];

  // Also include tasks that have scheduledDate === today or dueDate === today from allTasks
  const fromTasks = (allTasks ?? []).filter((t) => t.scheduledDate === today || t.dueDate === today);

  // Merge unique tasks (by id)
  const map = new Map<string, Task>();
  fromSchedule.forEach((t) => map.set(t.id, t));
  fromTasks.forEach((t) => map.set(t.id, t));

  return Array.from(map.values());
}

export function getSprintLabel(sprint: Sprint | null) {
  if (!sprint) {
    return "未設定";
  }

  return `${sprint.startDate} 〜 ${sprint.endDate}`;
}
