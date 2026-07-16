import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTasks } from "@/lib/use-tasks";
import { TaskEditor } from "./task.new";

export const Route = createFileRoute("/task/$id")({
  head: () => ({
    meta: [
      { title: "Edit task — Daily Planner" },
      { name: "description", content: "Edit a task in your planner." },
    ],
  }),
  component: EditTaskPage,
});

function EditTaskPage() {
  const { id } = Route.useParams();
  const { data: tasks, isLoading } = useTasks();
  const navigate = useNavigate();
  const task = tasks?.find((t) => t.id === id);

  useEffect(() => {
    if (!isLoading && tasks && !task) navigate({ to: "/" });
  }, [isLoading, tasks, task, navigate]);

  if (!task) return null;
  return <TaskEditor initial={task} />;
}
