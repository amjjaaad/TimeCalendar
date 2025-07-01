import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  IoAdd,
  IoClose,
  IoTime,
  IoPersonCircle,
  IoRefresh,
  IoAlertCircle,
  IoCheckmarkCircle,
  IoTrash,
  IoPhonePortrait,
  IoWarning,
  IoAlert,
  IoSearch,
  IoResize,
} from "react-icons/io5";
import { MdDragIndicator, MdZoomIn, MdZoomOut } from "react-icons/md";
import { FiEdit3, FiClock, FiUser, FiFlag } from "react-icons/fi";

import { clsx } from "clsx";

interface Task {
  id: string;
  title: string;
  startTime: number;
  duration: number;
  priority: "low" | "medium" | "high";
  description?: string;
  userId: string;
  userName: string;
}

interface Conflict {
  taskIds: string[];
  message: string;
}

const TimelineEditor: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Team Standup Meeting",
      startTime: 9,
      duration: 1,
      priority: "high",
      description: "Daily team sync and planning session",
      userId: "1",
      userName: "",
    },
    {
      id: "2",
      title: "Design Review",
      startTime: 10.5,
      duration: 1.5,
      priority: "medium",
      description: "Review new UI mockups and prototypes",
      userId: "2",
      userName: "",
    },
    {
      id: "3",
      title: "Documentation Update",
      startTime: 12.5,
      duration: 1.5,
      priority: "low",
      description: "Update API documentation and user guides",
      userId: "4",
      userName: "",
    },
    {
      id: "4",
      title: "Sprint Planning",
      startTime: 14.5,
      duration: 1.5,
      priority: "high",
      description: "Plan next sprint tasks and assignments",
      userId: "2",
      userName: "",
    },
    {
      id: "5",
      title: "Client Presentation",
      startTime: 16.5,
      duration: 1.5,
      priority: "high",
      description: "Present project progress to stakeholders",
      userId: "3",
      userName: "",
    },
    {
      id: "6",
      title: "Code Review Session",
      startTime: 18.5,
      duration: 1,
      priority: "medium",
      description: "Review pull requests and merge changes",
      userId: "1",
      userName: "",
    },
  ]);

  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [originalTaskPosition, setOriginalTaskPosition] = useState<{
    [key: string]: number;
  }>({});
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("info");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [newTaskStartTime, setNewTaskStartTime] = useState<number>(9);
  const [newTaskDuration, setNewTaskDuration] = useState<number>(1);
  const [newTaskUserName, setNewTaskUserName] = useState("");
  const [newTaskStartTimeStr, setNewTaskStartTimeStr] = useState("9");
  const [newTaskDurationStr, setNewTaskDurationStr] = useState("1");

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [zoomUpdateTimeout, setZoomUpdateTimeout] = useState<number | null>(
    null,
  );
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getResponsiveHourWidth = () => {
    const stableZoomLevel = Math.max(0.5, Math.min(3, zoomLevel || 1));

    let baseWidth;
    if (windowWidth < 480) {
      baseWidth = Math.max(60, Math.min(80, windowWidth / 6));
    } else if (windowWidth < 768) {
      baseWidth = Math.max(80, Math.min(100, windowWidth / 8));
    } else if (windowWidth < 1024) {
      baseWidth = Math.max(100, Math.min(120, windowWidth / 10));
    } else if (windowWidth < 1440) {
      baseWidth = Math.max(120, Math.min(140, windowWidth / 12));
    } else {
      baseWidth = Math.max(140, Math.min(160, windowWidth / 15));
    }

    return baseWidth * stableZoomLevel;
  };

  const hourWidth = getResponsiveHourWidth();
  const taskCardWidth = isMobile ? Math.min(280, windowWidth - 40) : 280;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    setTimeout(() => {
      if (isMobile) {
        showNotification("Tap to edit • Drag to reschedule • Pinch to zoom!");
      } else {
        showNotification("Click to edit • Drag to reschedule!");
      }
    }, 1500);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (showAddDialog || showEditDialog) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "0px";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [showAddDialog, showEditDialog]);

  useEffect(() => {
    return () => {
      if (zoomUpdateTimeout) {
        clearTimeout(zoomUpdateTimeout);
      }
    };
  }, [zoomUpdateTimeout]);

  useEffect(() => {
    const newConflicts: Conflict[] = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];

        const task1End = task1.startTime + task1.duration;
        const task2End = task2.startTime + task2.duration;

        const hasOverlap =
          task1.startTime < task2End && task2.startTime < task1End;

        if (hasOverlap) {
          newConflicts.push({
            taskIds: [task1.id, task2.id],
            message: `"${task1.title}" overlaps with "${task2.title}"`,
          });
        }
      }
    }

    setConflicts(newConflicts);
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.startTime - b.startTime);
  }, [tasks]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setNotification(message);
    setNotificationType(type);
    setTimeout(() => {
      setNotification(null);
      setNotificationType("info");
    }, 4000);
  };

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-gradient-to-br from-red-100 to-red-200",
          border: "border-red-300",
          badge: "bg-red-200 text-red-800",
          shadow: "shadow-red-100",
        };
      case "medium":
        return {
          bg: "bg-gradient-to-br from-yellow-100 to-yellow-200",
          border: "border-yellow-300",
          badge: "bg-yellow-200 text-yellow-800",
          shadow: "shadow-yellow-100",
        };
      case "low":
        return {
          bg: "bg-gradient-to-br from-green-100 to-green-200",
          border: "border-green-300",
          badge: "bg-green-200 text-green-800",
          shadow: "shadow-green-100",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-blue-100 to-blue-200",
          border: "border-blue-300",
          badge: "bg-blue-200 text-blue-800",
          shadow: "shadow-blue-100",
        };
    }
  };

  const getConflictStyle = (taskId: string) => {
    const isConflicted = conflicts.some((c) => c.taskIds.includes(taskId));
    return isConflicted
      ? "border-2 border-red-400 bg-gradient-to-br from-red-200 to-red-300 shadow-red-200"
      : "";
  };

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour % 1) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastPinchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);

      if (lastPinchDistance > 0) {
        const scale = distance / lastPinchDistance;

        if (Math.abs(scale - 1) > 0.02) {
          const newZoomLevel = Math.max(0.5, Math.min(3, zoomLevel * scale));

          if (zoomUpdateTimeout) {
            clearTimeout(zoomUpdateTimeout);
          }

          setZoomLevel(newZoomLevel);
          setLastPinchDistance(distance);

          setZoomUpdateTimeout(null);
        }
      } else {
        setLastPinchDistance(distance);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      const wasPinching = isPinching;
      setIsPinching(false);
      setLastPinchDistance(0);

      if (wasPinching) {
        showNotification(`Zoom: ${Math.round(zoomLevel * 100)}%`);
      }

      if (zoomUpdateTimeout) {
        clearTimeout(zoomUpdateTimeout);
        setZoomUpdateTimeout(null);
      }
    }
  };

  const checkTaskConflict = (
    taskId: string,
    newStartTime: number,
    duration: number,
    allTasks: Task[],
  ) => {
    const taskEnd = newStartTime + duration;

    return allTasks.some((task) => {
      if (task.id === taskId) return false;

      const otherTaskEnd = task.startTime + task.duration;
      return newStartTime < otherTaskEnd && task.startTime < taskEnd;
    });
  };

  const handleDragStart = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setOriginalTaskPosition((prev) => ({
        ...prev,
        [taskId]: task.startTime,
      }));
    }
  };

  const handleDragEnd = (taskId: string, info: PanInfo) => {
    const deltaX = info.offset.x;
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      console.warn("Task not found during drag end");
      return;
    }

    if (Math.abs(deltaX) > 20) {
      const hoursDelta = Math.round(deltaX / hourWidth);
      const newStartTime = Math.max(
        0,
        Math.min(23, task.startTime + hoursDelta),
      );

      const originalStart = originalTaskPosition[taskId];

      const hasConflict = checkTaskConflict(
        taskId,
        newStartTime,
        task.duration,
        tasks,
      );

      if (hasConflict) {
        if (originalStart !== undefined) {
          setTasks((prevTasks) =>
            prevTasks.map((t) =>
              t.id === taskId ? { ...t, startTime: originalStart } : t,
            ),
          );

          const conflictingTask = tasks.find((t) => {
            if (t.id === taskId) return false;
            const tEnd = t.startTime + t.duration;
            const newEnd = newStartTime + task.duration;
            return newStartTime < tEnd && t.startTime < newEnd;
          });

          const timeStr = formatTime(newStartTime);
          if (conflictingTask) {
            showNotification(
              `Cannot schedule at ${timeStr} - conflicts with "${conflictingTask.title}"`,
              "error",
            );
          } else {
            showNotification(
              `Cannot move task - scheduling conflict detected`,
              "error",
            );
          }
        }
      } else if (newStartTime !== task.startTime) {
        setTasks((prevTasks) =>
          prevTasks.map((t) => {
            if (t.id === taskId) {
              return { ...t, startTime: newStartTime };
            }
            return t;
          }),
        );

        const oldTimeStr = formatTime(task.startTime);
        const newTimeStr = formatTime(newStartTime);
        showNotification(
          `"${task.title}" moved from ${oldTimeStr} to ${newTimeStr}`,
          "success",
        );
      }
    }

    setOriginalTaskPosition((prev) => {
      const newPos = { ...prev };
      delete newPos[taskId];
      return newPos;
    });
  };

  const handleAddTask = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskStartTime(9);
    setNewTaskDuration(1);
    setNewTaskUserName("");
    setNewTaskStartTimeStr("9");
    setNewTaskDurationStr("1");
    setShowAddDialog(true);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      showNotification("Please enter a task title", "error");
      return;
    }

    // Parse start time - handle empty string or "0" correctly
    const startTime = newTaskStartTimeStr === "" || newTaskStartTimeStr === "0" 
      ? 0 
      : Math.max(0, Math.min(23, parseInt(newTaskStartTimeStr) || 9));
    
    const duration = Math.max(
      0.5,
      Math.min(12, parseFloat(newTaskDurationStr) || 1),
    );

    const hasConflict = tasks.some((task) => {
      const taskEnd = task.startTime + task.duration;
      const newTaskEnd = startTime + duration;
      return startTime < taskEnd && task.startTime < newTaskEnd;
    });

    if (hasConflict) {
      const timeStr = formatTime(startTime);
      const endTimeStr = formatTime(startTime + duration);
      showNotification(
        `Cannot create task - time slot ${timeStr} to ${endTimeStr} is already occupied`,
        "error",
      );
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      priority: newTaskPriority,
      startTime: startTime,
      duration: duration,
      userId: Date.now().toString(),
      userName: newTaskUserName,
    };

    setTasks((prev) => [...prev, newTask]);
    setShowAddDialog(false);

    const timeStr = formatTime(startTime);
    showNotification(`"${newTask.title}" created at ${timeStr}`, "success");
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditDialog(true);
  };

  const handleUpdateTask = () => {
    if (!editingTask || !editingTask.title.trim()) {
      showNotification("Please enter a task title", "error");
      return;
    }

    const hasConflict = tasks.some((task) => {
      if (task.id === editingTask.id) return false;
      const taskEnd = task.startTime + task.duration;
      const editedTaskEnd = editingTask.startTime + editingTask.duration;
      return editingTask.startTime < taskEnd && task.startTime < editedTaskEnd;
    });

    if (hasConflict) {
      const timeStr = formatTime(editingTask.startTime);
      const endTimeStr = formatTime(
        editingTask.startTime + editingTask.duration,
      );
      showNotification(
        `Cannot update task - time slot ${timeStr} to ${endTimeStr} conflicts with existing tasks`,
        "error",
      );
      return;
    }

    setTasks((prev) =>
      prev.map((task) => (task.id === editingTask.id ? editingTask : task)),
    );
    setShowEditDialog(false);
    setEditingTask(null);

    const timeStr = formatTime(editingTask.startTime);
    showNotification(
      `"${editingTask.title}" updated - scheduled at ${timeStr}`,
      "success",
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setShowEditDialog(false);
    setEditingTask(null);
    showNotification("Task deleted", "success");
  };

  const resetZoom = () => {
    if (zoomUpdateTimeout) {
      clearTimeout(zoomUpdateTimeout);
      setZoomUpdateTimeout(null);
    }

    if (zoomLevel !== 1) {
      setZoomLevel(1);
      showNotification("Zoom reset to 100%");
    }
  };

  const zoomIn = () => {
    if (zoomUpdateTimeout) {
      clearTimeout(zoomUpdateTimeout);
      setZoomUpdateTimeout(null);
    }

    const currentZoom = Math.max(0.5, Math.min(3, zoomLevel));
    const newZoom = Math.min(3, currentZoom + 0.25);

    if (newZoom !== currentZoom) {
      setZoomLevel(newZoom);
      showNotification(`Zoomed in to ${Math.round(newZoom * 100)}%`);
    }
  };

  const zoomOut = () => {
    if (zoomUpdateTimeout) {
      clearTimeout(zoomUpdateTimeout);
      setZoomUpdateTimeout(null);
    }

    const currentZoom = Math.max(0.5, Math.min(3, zoomLevel));
    const newZoom = Math.max(0.5, currentZoom - 0.25);

    if (newZoom !== currentZoom) {
      setZoomLevel(newZoom);
      showNotification(`Zoomed out to ${Math.round(newZoom * 100)}%`);
    }
  };

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap");
        * {
          font-family: 'Outfit';
        }
        html, body { 
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        * { 
          -webkit-touch-callout: none;
        }
        .touch-manipulation {
          touch-action: manipulation;
        }
        .gradient-mesh {
          background: 
            radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.1) 0px, transparent 0%),
            radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%),
            radial-gradient(at 52% 99%, hsla(354, 98%, 61%, 0.1) 0px, transparent 50%),
            radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.1) 0px, transparent 50%),
            radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 0.1) 0px, transparent 50%),
            radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 0.1) 0px, transparent 50%),
            radial-gradient(at 79% 53%, hsla(343, 68%, 79%, 0.1) 0px, transparent 50%);
        }
        .clay-effect {
          background: linear-gradient(145deg, #f0f2f5, #e1e5ea);
          box-shadow: 
            8px 8px 16px rgba(174, 190, 205, 0.4),
            -8px -8px 16px rgba(255, 255, 255, 0.8),
            inset 2px 2px 4px rgba(255, 255, 255, 0.6),
            inset -2px -2px 4px rgba(174, 190, 205, 0.3);
          border-radius: 20px;
        }
        .card-shadow {
          box-shadow: 
            0 8px 32px 0 rgba(31, 38, 135, 0.37),
            0 2px 8px 0 rgba(0, 0, 0, 0.1),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
        }
        .premium-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stunning-title {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s ease-in-out infinite;
          position: relative;
        }

        @keyframes shimmer {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }



        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          box-shadow: 
            0 2px 8px rgba(102, 126, 234, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);
          box-shadow: 
            0 4px 16px rgba(102, 126, 234, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        ::-webkit-scrollbar-thumb:active {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
          box-shadow: 
            0 2px 12px rgba(102, 126, 234, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        ::-webkit-scrollbar-corner {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(102, 126, 234, 0.6) rgba(255, 255, 255, 0.1);
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          ::-webkit-scrollbar-thumb {
            border-radius: 8px;
          }

          ::-webkit-scrollbar-track {
            border-radius: 8px;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen gradient-mesh relative overflow-x-hidden flex flex-col"
        style={{
          background: `
            linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%),
            linear-gradient(45deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%),
            #fafbff
          `,
        }}
      >
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="sticky top-0 z-50 clay-effect border-b border-slate-200/20 px-4 md:px-6 py-4 md:py-6"
        >
          <div className="max-w-7xl mx-auto">
            {/* Mobile Layout */}
            {isMobile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <motion.h1
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.3,
                      duration: 0.8,
                      type: "spring",
                      stiffness: 100,
                    }}
                    className="text-xl font-black stunning-title"
                    style={{
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Timeline Pro
                  </motion.h1>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <FiClock className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">
                      {tasks.length}
                    </span>
                    <span className="mx-1">tasks</span>
                    <span className="text-slate-500">
                      • Tap to edit • Drag to move
                    </span>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Desktop Layout */
              <div className="flex items-center justify-between">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="relative flex-1"
                >
                  <div className="relative">
                    <motion.h1
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: 0.3,
                        duration: 0.8,
                        type: "spring",
                        stiffness: 100,
                      }}
                      className="text-2xl md:text-3xl font-black stunning-title mb-1 relative"
                      style={{
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      <span>Timeline</span>
                      <span> Pro</span>
                    </motion.h1>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="flex items-center gap-4 mt-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                      <FiClock className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-800">
                        {tasks.length}
                      </span>
                      <span className="mx-2">active tasks</span>
                      <span className="text-xs text-slate-500">
                        • Drag to reschedule • Pinch to zoom
                      </span>
                    </div>
                  </motion.div>
                </motion.div>

                
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                },
              }}
              exit={{
                opacity: 0,
                y: -50,
                scale: 0.8,
                transition: {
                  duration: 0.2,
                },
              }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[60] clay-effect border border-slate-200/20 rounded-2xl px-6 py-4 card-shadow text-sm font-medium text-slate-800 max-w-sm text-center"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  {notificationType === "success" && (
                    <IoCheckmarkCircle className="w-4 h-4 text-green-500" />
                  )}
                  {notificationType === "error" && (
                    <IoAlert className="w-4 h-4 text-red-500" />
                  )}
                  {notificationType === "info" && (
                    <FiClock className="w-4 h-4 text-blue-500" />
                  )}
                </motion.div>
                <span>{notification}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="flex-1 relative overflow-hidden"
          style={{ minHeight: isMobile ? "calc(100vh - 200px)" : "calc(100vh - 200px)" }}
        >
          <motion.div
            ref={timelineRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className={`overflow-auto scroll-smooth ${isMobile ? "overscroll-behavior-none" : ""} h-full pb-20`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: isMobile ? "none" : "thin",
              msOverflowStyle: isMobile ? "none" : "auto",
              position: "relative",
              height: "100%",
              transform: "translateZ(0)",
              zIndex: 10,
            }}
          >
            <div
              className={`${isMobile ? "sticky" : "sticky"} top-0 z-40 border-b border-white/10 shadow-lg`}
              style={{
                position: isMobile ? "-webkit-sticky" : "sticky",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                willChange: "transform",
                zIndex: 40,
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex"
              >
                {hours.map((hour) => (
                  <motion.div
                    key={hour}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: hour * 0.02,
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    whileHover={{
                      scale: 1.05,
                      backgroundColor: "rgba(102, 126, 234, 0.05)",
                    }}
                    className="flex flex-col items-center justify-center py-4 border-r border-white/10 transition-all duration-200 hover:bg-white/30 cursor-pointer shrink-0 bg-white/95"
                    style={{
                      minWidth: `${hourWidth}px`,
                      width: `${hourWidth}px`,
                    }}
                  >
                    <motion.div
                      className="text-sm font-bold text-slate-800 mb-1"
                      whileHover={{ scale: 1.1 }}
                    >
                      {hour.toString().padStart(2, "0")}:00
                    </motion.div>
                    <div className="text-xs text-slate-500 font-medium">
                      {hour === 0
                        ? "12 AM"
                        : hour < 12
                          ? `${hour} AM`
                          : hour === 12
                            ? "12 PM"
                            : `${hour - 12} PM`}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div
              className={`relative ${isMobile ? "p-3" : "p-6"} h-full`}
              style={{ width: `${24 * hourWidth}px`, minHeight: "500px" }}
            >
              <div className="absolute inset-0 pointer-events-none">
                {hours.map((hour) => (
                  <motion.div
                    key={`grid-${hour}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: hour * 0.02 }}
                    className="absolute top-0 bottom-0 w-px bg-gray-200/50"
                    style={{ left: `${hour * hourWidth + (isMobile ? 12 : 24)}px` }}
                  />
                ))}
              </div>

              <div className={`${isMobile ? "space-y-3" : "space-y-4"}`}>
                {sortedTasks.map((task, index) => {
                  const colors = getPriorityColors(task.priority);
                  const conflictStyle = getConflictStyle(task.id);

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      drag="x"
                      dragElastic={0.1}
                      dragConstraints={{ left: -100, right: 100 }}
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={(_, info) => handleDragEnd(task.id, info)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileDrag={{ scale: 1.05, rotate: 1, zIndex: 30 }}
                      className={clsx(
                        "relative cursor-grab active:cursor-grabbing select-none backdrop-blur-sm touch-manipulation overflow-hidden",
                        isMobile ? "rounded-2xl p-3" : "rounded-3xl p-4",
                        "border-2 shadow-2xl transition-all duration-300",
                        conflictStyle ||
                          `${colors.border} ${colors.bg} ${colors.shadow}`,
                        isMobile ? "min-h-[120px]" : "h-fit min-h-[100px]",
                      )}
                      style={{
                        width: `${task.duration * hourWidth}px`,
                        marginLeft: `${task.startTime * hourWidth + (isMobile ? 12 : 24)}px`,
                        flexShrink: 0,
                        minWidth: isMobile 
                          ? `${Math.max(200, task.duration * hourWidth)}px` 
                          : `${Math.min(120, task.duration * hourWidth)}px`,
                        zIndex: 20,
                      }}
                      onClick={() => handleEditTask(task)}
                    >
                      <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                        <div className={`flex-1 pr-${isMobile ? "4" : "6"} ${isMobile ? "space-y-1" : "space-y-2"}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={clsx(
                              "inline-flex items-center rounded-full font-bold shrink-0",
                              isMobile ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-xs",
                              colors.badge,
                            )}
                          >
                            <FiFlag className={`${isMobile ? "w-2.5 h-2.5" : "w-3 h-3"} mr-1 shrink-0`} />
                            <span className="truncate">
                              {task.priority.toUpperCase()}
                            </span>
                          </motion.div>

                          <h3
                            className={`font-bold text-gray-800 ${isMobile ? "text-xs" : "text-sm"} leading-tight ${isMobile ? "line-clamp-2" : "truncate"} pr-1`}
                            title={task.title}
                          >
                            {task.title}
                          </h3>

                          {isMobile && task.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 leading-tight">
                              {task.description}
                            </p>
                          )}

                          <div className={`text-xs text-gray-600 ${isMobile ? "space-y-0.5" : "space-y-1"}`}>
                            <div className="flex items-center gap-1 truncate">
                              <IoTime className={`${isMobile ? "w-2.5 h-2.5" : "w-3 h-3"} shrink-0`} />
                              <span className="font-medium truncate">
                                {formatTime(task.startTime)} -{" "}
                                {formatTime(task.startTime + task.duration)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 truncate">
                              <span className="text-xs font-medium">
                                {task.duration}h duration
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <motion.div
                        className={`absolute ${isMobile ? "top-1.5 right-1.5" : "top-2 right-2"} text-gray-400`}
                        whileHover={{ scale: 1.2 }}
                      >
                        <MdDragIndicator className={`${isMobile ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {showAddDialog && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/30 z-[100]"
                  onClick={() => setShowAddDialog(false)}
                />
                <motion.div
                  initial={{
                    x: isMobile ? 0 : "100%",
                    y: isMobile ? "-100%" : 0,
                  }}
                  animate={{ x: 0, y: 0 }}
                  exit={{ x: isMobile ? 0 : "100%", y: isMobile ? "-100%" : 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className={clsx(
                    "absolute z-[101] overflow-y-auto clay-effect",
                    isMobile
                      ? "inset-x-4 top-4 bottom-4 rounded-3xl"
                      : "top-4 right-4 bottom-4 w-[450px] rounded-3xl",
                  )}
                  style={{
                    boxShadow: `
                      8px 8px 32px rgba(174, 190, 205, 0.6),
                      -8px -8px 32px rgba(255, 255, 255, 0.9),
                      inset 4px 4px 8px rgba(255, 255, 255, 0.7),
                      inset -4px -4px 8px rgba(174, 190, 205, 0.4)
                    `,
                  }}
                >
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                            <IoAdd className="w-5 h-5 text-white" />
                          </div>
                          Add New Task
                        </h2>
                        <p className="text-sm text-slate-500">
                          Create a new task for your timeline
                        </p>
                      </div>
                      <motion.button
                        whileHover={{
                          scale: 1.1,
                          backgroundColor: "rgba(248, 250, 252, 1)",
                        }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowAddDialog(false)}
                        className="w-10 h-10 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200"
                      >
                        <IoClose className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          Task Title
                        </label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800 placeholder-slate-400"
                          placeholder="Enter task title..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          Description
                        </label>
                        <textarea
                          value={newTaskDescription}
                          onChange={(e) =>
                            setNewTaskDescription(e.target.value)
                          }
                          rows={3}
                          className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none resize-none transition-all bg-white/50 text-slate-800 placeholder-slate-400"
                          placeholder="Task description..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          Priority
                        </label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) =>
                            setNewTaskPriority(
                              e.target.value as "low" | "medium" | "high",
                            )
                          }
                          className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3">
                            Start Time
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={newTaskStartTimeStr}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9]/g,
                                "",
                              );
                              if (
                                value === "" ||
                                (parseInt(value) >= 0 && parseInt(value) <= 23) ||
                                value === "0"
                              ) {
                                setNewTaskStartTimeStr(value);
                              }
                            }}
                            className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"
                            placeholder="0-23"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3">
                            Duration (hrs)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            value={newTaskDurationStr}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              if (
                                value === "" ||
                                (!isNaN(parseFloat(value)) &&
                                  parseFloat(value) <= 12)
                              ) {
                                setNewTaskDurationStr(value);
                              }
                            }}
                            className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"
                            placeholder="0.5-12"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-slate-200/50 mt-8">
                      <motion.button
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddDialog(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all duration-200"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 8px 25px rgba(102, 126, 234, 0.35)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreateTask}
                        className="flex-1 py-4 premium-gradient text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <IoCheckmarkCircle className="w-5 h-5" />
                        Create Task
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {showEditDialog && editingTask && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/30 z-[100]"
                  onClick={() => setShowEditDialog(false)}
                />
                <motion.div
                  initial={{
                    x: isMobile ? 0 : "100%",
                    y: isMobile ? "-100%" : 0,
                  }}
                  animate={{ x: 0, y: 0 }}
                  exit={{ x: isMobile ? 0 : "100%", y: isMobile ? "-100%" : 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className={clsx(
                    "absolute z-[101] overflow-y-auto clay-effect",
                    isMobile
                      ? "inset-x-4 top-4 bottom-4 rounded-3xl"
                      : "top-4 right-4 bottom-4 w-[450px] rounded-3xl",
                  )}
                  style={{
                    boxShadow: `
                      8px 8px 32px rgba(174, 190, 205, 0.6),
                      -8px -8px 32px rgba(255, 255, 255, 0.9),
                      inset 4px 4px 8px rgba(255, 255, 255, 0.7),
                      inset -4px -4px 8px rgba(174, 190, 205, 0.4)
                    `,
                  }}
                >
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                            <FiEdit3 className="w-5 h-5 text-white" />
                          </div>
                          Edit Task
                        </h2>
                        <p className="text-sm text-slate-500">
                          Modify your task details
                        </p>
                      </div>
                      <motion.button
                        whileHover={{
                          scale: 1.1,
                          backgroundColor: "rgba(248, 250, 252, 1)",
                        }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowEditDialog(false)}
                        className="w-10 h-10 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200"
                      >
                        <IoClose className="w-5 h-5" />
                      </motion.button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          Task Title
                        </label>
                        <input
                          type="text"
                          value={editingTask.title}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              title: e.target.value,
                            })
                          }
                          className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800 placeholder-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          Description
                        </label>
                        <textarea
                          value={editingTask.description || ""}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none resize-none transition-all bg-white/50 text-slate-800 placeholder-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          Priority
                        </label>
                        <select
                          value={editingTask.priority}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              priority: e.target.value as
                                | "low"
                                | "medium"
                                | "high",
                            })
                          }
                          className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3">
                            Start Time
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={editingTask.startTime.toString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9]/g,
                                "",
                              );
                              if (
                                value === "" ||
                                (parseInt(value) >= 0 && parseInt(value) <= 23) ||
                                value === "0"
                              ) {
                                setEditingTask({
                                  ...editingTask,
                                  startTime: value === "" ? 0 : parseInt(value),
                                });
                              }
                            }}
                            className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"
                            placeholder="0-23"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3">
                            Duration (hrs)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            value={editingTask.duration.toString()}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              if (
                                value === "" ||
                                (!isNaN(parseFloat(value)) &&
                                  parseFloat(value) <= 12)
                              ) {
                                setEditingTask({
                                  ...editingTask,
                                  duration: parseFloat(value) || 0.5,
                                });
                              }
                            }}
                            className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"
                            placeholder="0.5-12"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-8 border-t border-slate-200/50 mt-8">
                      <motion.button
                        whileHover={{
                          scale: 1.05,
                          boxShadow: "0 4px 20px rgba(239, 68, 68, 0.25)",
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteTask(editingTask.id)}
                        className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <IoTrash className="w-4 h-4" />
                        Delete
                      </motion.button>
                      <motion.button
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowEditDialog(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all duration-200 flex items-center justify-center"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 8px 25px rgba(102, 126, 234, 0.35)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUpdateTask}
                        className="flex-1 py-4 premium-gradient text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <IoCheckmarkCircle className="w-5 h-5" />
                        Update
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className={`fixed ${isMobile ? "bottom-4 left-4 gap-2" : "bottom-6 left-6 gap-3"} flex items-center z-50`}
        >
          <motion.button
            whileHover={{
              scale: 1.1,
              boxShadow: "0 8px 25px rgba(102, 126, 234, 0.25)",
            }}
            whileTap={{ scale: 0.9 }}
            onClick={zoomOut}
            className={clsx(
              "clay-effect border border-slate-200/20 rounded-full flex items-center justify-center text-slate-700 font-bold card-shadow touch-manipulation transition-all duration-200",
              isMobile ? "w-12 h-12 text-base" : "w-14 h-14 text-lg",
            )}
          >
            <MdZoomOut />
          </motion.button>

          {!isMobile && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="clay-effect border border-slate-200/20 rounded-full px-5 py-3 text-sm font-bold text-slate-700 card-shadow"
            >
              {Math.round(zoomLevel * 100)}%
            </motion.div>
          )}

          {zoomLevel !== 1 && (
            <motion.button
              whileHover={{
                scale: 1.1,
                boxShadow: "0 8px 25px rgba(34, 197, 94, 0.25)",
              }}
              whileTap={{ scale: 0.9 }}
              onClick={resetZoom}
              className={clsx(
                "clay-effect border border-slate-200/20 rounded-full flex items-center justify-center text-slate-700 font-bold card-shadow touch-manipulation transition-all duration-200",
                isMobile ? "w-12 h-12 text-base" : "w-14 h-14 text-lg",
              )}
            >
              <IoRefresh />
            </motion.button>
          )}

          <motion.button
            whileHover={{
              scale: 1.1,
              boxShadow: "0 8px 25px rgba(147, 51, 234, 0.25)",
            }}
            whileTap={{ scale: 0.9 }}
            onClick={zoomIn}
            className={clsx(
              "clay-effect border border-slate-200/20 rounded-full flex items-center justify-center text-slate-700 font-bold card-shadow touch-manipulation transition-all duration-200",
              isMobile ? "w-12 h-12 text-base" : "w-14 h-14 text-lg",
            )}
          >
            <MdZoomIn />
          </motion.button>

          {isMobile && zoomLevel !== 1 && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="clay-effect border border-slate-200/20 rounded-full px-4 py-2 text-xs font-bold text-slate-700 card-shadow"
            >
              {Math.round(zoomLevel * 100)}%
            </motion.div>
          )}
        </motion.div>

        {/* Floating Action Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 12px 35px rgba(102, 126, 234, 0.4)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddTask}
          className={clsx(
            "fixed premium-gradient text-white flex items-center justify-center gap-3 card-shadow touch-manipulation transition-all duration-300 z-50 font-semibold",
            isMobile 
              ? "bottom-4 right-4 w-14 h-14 rounded-full shadow-2xl" 
              : "bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl hover:shadow-3xl"
          )}
          style={{
            boxShadow: `
              0 8px 32px rgba(102, 126, 234, 0.3),
              0 4px 16px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
          }}
        >
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <IoAdd className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
          </motion.div>
          {!isMobile && (
            <span className="text-sm font-semibold">Create Task</span>
          )}
        </motion.button>

        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-auto border-t border-slate-200/20 bg-white/30 backdrop-blur-sm"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Status indicator */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Online</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">v2.1.0</span>
              </motion.div>

              {/* Simple app info */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="text-xs text-slate-500 text-center sm:text-right"
              >
                <span className="font-semibold text-gradient">Timeline Pro</span>
                <span className="hidden sm:inline mx-2">•</span>
                <span className="block sm:inline">Streamlined task management</span>
              </motion.div>
            </div>
          </div>
        </motion.footer>
      </motion.div>
    </>
  );
};

export default TimelineEditor;
