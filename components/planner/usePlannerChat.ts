"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDevCalendar } from "@/components/AppProvider";
import type { PlannerMessage, ScheduleSuggestion } from "@/lib/planner";
import { createInitialPlannerMessage, generateMockPlan, splitStaleSuggestions } from "@/lib/planner";
import { getTodayString } from "@/lib/schedule";
import type { Project, Task } from "@/types/dev-calendar";

type Args = {
  tasks: Task[];
  projects: Project[];
};

export function usePlannerChat({ tasks, projects }: Args) {
  const { rescheduleTask } = useDevCalendar();
  const [messages, setMessages] = useState<PlannerMessage[]>(() => [createInitialPlannerMessage()]);
  const [input, setInput] = useState("");
  const [latestSuggestions, setLatestSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const incompleteTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, latestSuggestions.length]);

  // アシスタント返信をチャットに追加する。alternative があるときは A案/B案の選択肢を付ける
  const pushAssistantReply = (text: string, suggestions: ScheduleSuggestion[], alternative: ScheduleSuggestion[] | null = null) => {
    // 反映候補はデフォルトで主案(A案)をセットしておく
    setLatestSuggestions(suggestions);
    const choices = alternative
      ? [
          { label: "A案（おすすめ）", suggestions },
          { label: "B案", suggestions: alternative }
        ]
      : undefined;
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        suggestions,
        choices
      }
    ]);
  };

  const sendMessage = (value: string) => {
    const text = value.trim();
    if (!text) return;

    setNotice(null);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    setInput("");

    const result = generateMockPlan(text, incompleteTasks, projects);
    pushAssistantReply(result.message, result.suggestions, result.alternative);
  };

  const useQuickAction = (value: string) => {
    sendMessage(value);
  };

  const rerun = () => {
    const sourceText = messages.slice().reverse().find((message) => message.role === "user")?.content ?? "今日の予定を組む";
    const result = generateMockPlan(sourceText, incompleteTasks, projects);
    pushAssistantReply(result.message, result.suggestions, result.alternative);
    setNotice("再提案を作成しました");
  };

  const makeLighter = () => {
    const result = generateMockPlan("軽めのタスクだけ", incompleteTasks, projects);
    pushAssistantReply(result.message, result.suggestions, result.alternative);
    setNotice("軽めの提案に切り替えました");
  };

  // A案/B案ボタンで選ばれた案を反映候補に切り替える
  const chooseSuggestions = (choice: { label: string; suggestions: ScheduleSuggestion[] }) => {
    setLatestSuggestions(choice.suggestions);
    setNotice(`${choice.label}を反映候補にしました`);
  };

  const reflect = () => {
    if (latestSuggestions.length === 0) {
      setNotice("反映できる提案がありません。まず予定の相談をしてください");
      return;
    }

    const { valid, stale } = splitStaleSuggestions(latestSuggestions, getTodayString());

    if (valid.length === 0) {
      setNotice("提案の対象日が過ぎています。再提案してください");
      return;
    }

    valid.forEach((suggestion) => {
      rescheduleTask(suggestion.taskId, suggestion.date);
    });

    const lines = valid.map(
      (suggestion) => `・${suggestion.dateLabel} ${suggestion.startTime}〜${suggestion.endTime} ${suggestion.taskTitle}`
    );
    const staleNote = stale.length > 0 ? `\n※ 対象日が過ぎていた${stale.length}件はスキップしました。` : "";

    setLatestSuggestions([]);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `以下の予定をタスクに反映しました。\n${lines.join("\n")}${staleNote}\n\nカレンダーやTodayページで確認できます。`
      }
    ]);
    setNotice(`${valid.length}件の予定を反映しました`);
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    useQuickAction,
    latestSuggestions,
    notice,
    rerun,
    makeLighter,
    reflect,
    chooseSuggestions,
    bottomRef,
    incompleteTasks
  };
}
