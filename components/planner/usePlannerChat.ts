"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlannerMessage, PlannerSuggestion } from "@/lib/planner";
import { createInitialPlannerMessage, generateMockPlan } from "@/lib/planner";
import type { Project, Task } from "@/types/dev-calendar";

type Args = {
  tasks: Task[];
  projects: Project[];
};

export function usePlannerChat({ tasks, projects }: Args) {
  const [messages, setMessages] = useState<PlannerMessage[]>(() => [createInitialPlannerMessage()]);
  const [input, setInput] = useState("");
  const [latestSuggestions, setLatestSuggestions] = useState<PlannerSuggestion[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const incompleteTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, latestSuggestions.length]);

  const pushAssistantReply = (text: string, suggestions: PlannerSuggestion[]) => {
    setLatestSuggestions(suggestions);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        suggestions
      }
    ]);
  };

  const sendMessage = (value: string) => {
    const text = value.trim();
    if (!text) return;

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    setInput("");

    const result = generateMockPlan(text, incompleteTasks, projects);
    pushAssistantReply(result.content, result.suggestions);
  };

  const useQuickAction = (value: string) => {
    sendMessage(value);
  };

  const rerun = () => {
    const sourceText = messages.slice().reverse().find((message) => message.role === "user")?.content ?? "今日の予定を組む";
    const result = generateMockPlan(`${sourceText} 再提案`, incompleteTasks, projects);
    pushAssistantReply(result.content, result.suggestions);
    setNotice("再提案を作成しました");
    console.log("[Planner] rerun suggestion", result);
  };

  const makeLighter = () => {
    const result = generateMockPlan("軽めのタスクだけ", incompleteTasks, projects);
    pushAssistantReply(result.content, result.suggestions);
    setNotice("軽めの提案に切り替えました");
    console.log("[Planner] lighter suggestion", result);
  };

  const reflect = () => {
    setNotice("予定を反映する処理はまだ未接続です");
    console.log("[Planner] reflect schedule", latestSuggestions);
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
    bottomRef,
    incompleteTasks
  };
}
