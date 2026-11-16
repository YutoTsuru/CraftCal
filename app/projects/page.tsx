"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import ProjectForm from "@/components/ProjectForm";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectIcon } from "@/components/ProjectIcon";
import { toPlainTextExcerpt } from "@/lib/project-summary";
import { Sparkles } from "lucide-react";
import { DEFAULT_PROJECT_COLOR } from "@/lib/colors";
import { getProjectProgress } from "@/lib/project-progress";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProjectsPage() {
  const { projects = [], tasks } = useDevCalendar();

  const stats = useMemo(() => {
    return projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.projectId === p.id);
      const done = projectTasks.filter((t) => t.status === "done").length;
      const todo = projectTasks.length - done;
      // 進捗率は共通関数に一本化 (Issue #112)
      const progress = getProjectProgress(tasks, p.id);

      return { project: p, total: projectTasks.length, done, todo, progress };
    });
  }, [projects, tasks]);

  return (
    <div className="grid gap-6">
      {/* ページ見出し (Issue #112)。「AIで計画する」リンクは右端の actions に移した */}
      <PageHeader
        title="プロジェクト"
        actions={
          <Link
            href="/projects/plan"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-lime-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-lime-800"
          >
            <Sparkles size={15} />
            AIで計画する
          </Link>
        }
      />

      <ProjectForm />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ project, total, done, todo, progress }) => {
          const excerpt = toPlainTextExcerpt(project.description);

          return (
            <Link key={project.id} href={`/projects/${project.id}`} className="block">
              <article className="group relative rounded-xl border border-stone-200 bg-surface p-5 shadow-sm hover:shadow transition-all">
                <div className="absolute right-3 top-3">
                  <StatusBadge status={project.status} kind="project" size="sm" />
                </div>

                <div className="flex items-start gap-3 pr-20">
                  <ProjectIcon
                    name={project.name}
                    iconPath={project.iconPath}
                    color={project.color}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold">{project.name}</h3>
                  {/* Issue #81: ここで MarkdownView を使うと、説明文中のリンクが <a> になり
                      カード全体を包む <Link> と入れ子になる（不正なHTML → hydration エラー →
                      カードのタップが効かなくなる）。記法を落としたプレーンテキストの抜粋にする */}
                    {excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-stone-600">{excerpt}</p>
                    )}
                  </div>
                </div>

                {/* カード下部の進捗: 数字は上段、バーはカード全幅 (Issue #112。以前は w-24 の小さなバーだった) */}
                <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
                  <div>未完了: {todo}</div>
                  <div className="text-sm">{progress}%</div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                  <div style={{ width: `${progress}%`, background: project.color ?? DEFAULT_PROJECT_COLOR }} className="h-2" />
                </div>
              </article>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
