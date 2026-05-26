"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import ProjectForm from "@/components/ProjectForm";

export default function ProjectsPage() {
  const { projects = [], tasks } = useDevCalendar();

  const stats = useMemo(() => {
    return projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.projectId === p.id);
      const done = projectTasks.filter((t) => t.status === "done").length;
      const todo = projectTasks.length - done;
      const progress = projectTasks.length === 0 ? 0 : Math.round((done / projectTasks.length) * 100);

      return { project: p, total: projectTasks.length, done, todo, progress };
    });
  }, [projects, tasks]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-indigo-600">Projects</p>
        <h2 className="mt-2 text-3xl font-bold">プロジェクト一覧</h2>
        <p className="mt-2 text-slate-400">プロジェクト単位でタスクを管理します。</p>
      </div>

      <ProjectForm />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ project, total, done, todo, progress }) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block">
              <article className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-md hover:shadow-lg transition-all">
                <div className="absolute top-3 right-3 text-xs rounded-full px-2 py-1 bg-slate-100 text-slate-700">{project.status}</div>

                <div>
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  {project.description && <p className="mt-1 text-sm text-slate-600 line-clamp-2">{project.description}</p>}
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <div>未完了: {todo}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm">{progress}%</div>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div style={{ width: `${progress}%`, background: project.color ?? "#10b981" }} className="h-2" />
                    </div>
                  </div>
                </div>
              </article>
            </Link>
        ))}
      </section>
    </div>
  );
}
