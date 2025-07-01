import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  IoAdd,
  IoClose,
  IoTime,
  IoRefresh,
  IoCheckmarkCircle,
  IoTrash,
  IoAlert,
} from "react-icons/io5";
import { MdDragIndicator, MdZoomIn, MdZoomOut } from "react-icons/md";
import { FiEdit3, FiClock, FiFlag } from "react-icons/fi";

import { clsx } from "clsx";

// --- INTERFACES & UTILITY FUNCTIONS ---
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

const getPriorityColors = (priority: string) => {
  switch (priority) {
    case "high": return { bg: "bg-gradient-to-br from-red-100 to-red-200", border: "border-red-300", badge: "bg-red-200 text-red-800", shadow: "shadow-red-100" };
    case "medium": return { bg: "bg-gradient-to-br from-yellow-100 to-yellow-200", border: "border-yellow-300", badge: "bg-yellow-200 text-yellow-800", shadow: "shadow-yellow-100" };
    case "low": return { bg: "bg-gradient-to-br from-green-100 to-green-200", border: "border-green-300", badge: "bg-green-200 text-green-800", shadow: "shadow-green-100" };
    default: return { bg: "bg-gradient-to-br from-blue-100 to-blue-200", border: "border-blue-300", badge: "bg-blue-200 text-blue-800", shadow: "shadow-blue-100" };
  }
};

const formatTime = (hour: number) => {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

interface TaskCardProps {
  task: Task;
  isConflicted: boolean;
  hourWidth: number;
  isMobile: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: (taskId: string, info: PanInfo) => void;
  onClick: (task: Task) => void;
}

// --- OPTIMIZED TASK CARD COMPONENT ---
const TaskCard = React.memo<TaskCardProps>(({
  task,
  isConflicted,
  hourWidth,
  isMobile,
  onDragStart,
  onDragEnd,
  onClick,
}) => {
  // FIX: Memoize color and style calculations inside the component.
  // This prevents new objects/strings from being created on every parent render,
  // which is crucial for React.memo to work effectively.
  const colors = useMemo(() => getPriorityColors(task.priority), [task.priority]);
  const conflictStyle = useMemo(() => 
    isConflicted ? "border-2 border-red-400 bg-gradient-to-br from-red-200 to-red-300 shadow-red-200" : "", 
    [isConflicted]
  );

  return (
    <motion.div
      key={task.id}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      drag="x"
      dragElastic={0.1}
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={(_, info) => onDragEnd(task.id, info)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileDrag={{ 
        scale: 1.05, 
        rotate: 1, 
        zIndex: 30,
        boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.2)" // Enhanced shadow on drag
      }}
      className={clsx(
        "relative cursor-grab active:cursor-grabbing select-none backdrop-blur-sm touch-manipulation overflow-hidden",
        isMobile ? "rounded-2xl p-3" : "rounded-3xl p-4",
        "border-2 shadow-xl transition-all duration-300",
        conflictStyle || `${colors.border} ${colors.bg} ${colors.shadow}`,
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
      onClick={() => onClick(task)}
    >
      <div className="w-full h-full flex flex-col justify-between overflow-hidden">
        <div className={`flex-1 pr-${isMobile ? "4" : "6"} ${isMobile ? "space-y-1" : "space-y-2"}`}>
          <div
            className={clsx(
              "inline-flex items-center rounded-full font-bold shrink-0",
              isMobile ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-xs",
              colors.badge,
            )}
          >
            <FiFlag className={`${isMobile ? "w-2.5 h-2.5" : "w-3 h-3"} mr-1.5 shrink-0`} />
            <span className="truncate">
              {task.priority.toUpperCase()}
            </span>
          </div>

          <h3
            className={`font-bold text-gray-800 ${isMobile ? "text-base" : "text-lg"} leading-tight ${isMobile ? "line-clamp-2" : "truncate"} pr-1`}
            title={task.title}
          >
            {task.title}
          </h3>

          <div className={`text-xs text-gray-600 ${isMobile ? "space-y-0.5" : "space-y-1"}`}>
            <div className="flex items-center gap-1.5 truncate">
              <IoTime className={`${isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} shrink-0`} />
              <span className="font-medium truncate">
                {formatTime(task.startTime)} -{" "}
                {formatTime(task.startTime + task.duration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-medium">
                {task.duration}h duration
              </span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className={`absolute ${isMobile ? "top-2 right-2" : "top-3 right-3"} text-gray-400 hover:text-gray-600 transition-colors`}
        whileHover={{ scale: 1.2 }}
      >
        {/* FIX: Increased icon size for better UX */}
        <MdDragIndicator className={`${isMobile ? "w-5 h-5" : "w-6 h-6"}`} />
      </motion.div>
    </motion.div>
  );
});


// --- MAIN APP COMPONENT ---
const TimelineEditor: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Team Standup Meeting", startTime: 9, duration: 1, priority: "high", description: "Daily team sync and planning session", userId: "1", userName: "" },
    { id: "2", title: "Design Review", startTime: 10.5, duration: 1.5, priority: "medium", description: "Review new UI mockups and prototypes", userId: "2", userName: "" },
    { id: "3", title: "Documentation Update", startTime: 12.5, duration: 1.5, priority: "low", description: "Update API documentation and user guides", userId: "4", userName: "" },
    { id: "4", title: "Sprint Planning", startTime: 14.5, duration: 1.5, priority: "high", description: "Plan next sprint tasks and assignments", userId: "2", userName: "" },
    { id: "5", title: "Client Presentation", startTime: 16.5, duration: 1.5, priority: "high", description: "Present project progress to stakeholders", userId: "3", userName: "" },
    { id: "6", title: "Code Review Session", startTime: 18.5, duration: 1, priority: "medium", description: "Review pull requests and merge changes", userId: "1", userName: "" },
  ]);

  const [originalTaskPosition, setOriginalTaskPosition] = useState<{ [key: string]: number; }>({});
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<"success" | "error" | "info">("info");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskStartTimeStr, setNewTaskStartTimeStr] = useState("9");
  const [newTaskDurationStr, setNewTaskDurationStr] = useState("1");

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);

  const timelineRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const hourWidth = useMemo(() => {
    const stableZoomLevel = Math.max(0.5, Math.min(3, zoomLevel || 1));
    let baseWidth;
    if (windowWidth < 480) baseWidth = Math.max(60, Math.min(80, windowWidth / 6));
    else if (windowWidth < 768) baseWidth = Math.max(80, Math.min(100, windowWidth / 8));
    else if (windowWidth < 1024) baseWidth = Math.max(100, Math.min(120, windowWidth / 10));
    else if (windowWidth < 1440) baseWidth = Math.max(120, Math.min(140, windowWidth / 12));
    else baseWidth = Math.max(140, Math.min(160, windowWidth / 15));
    return baseWidth * stableZoomLevel;
  }, [zoomLevel, windowWidth]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    setTimeout(() => {
      showNotification(isMobile ? "Tap to edit • Drag to reschedule • Pinch to zoom!" : "Click to edit • Drag to reschedule!");
    }, 1500);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  useEffect(() => {
    document.body.style.overflow = (showAddDialog || showEditDialog) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showAddDialog, showEditDialog]);

  useEffect(() => {
    const newConflicts: Conflict[] = [];
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];
        const task1End = task1.startTime + task1.duration;
        const task2End = task2.startTime + task2.duration;
        if (task1.startTime < task2End && task2.startTime < task1End) {
          newConflicts.push({ taskIds: [task1.id, task2.id], message: `"${task1.title}" overlaps with "${task2.title}"` });
        }
      }
    }
    setConflicts(newConflicts);
  }, [tasks]);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => a.startTime - b.startTime), [tasks]);
  const conflictIdSet = useMemo(() => new Set(conflicts.flatMap(c => c.taskIds)), [conflicts]);

  const showNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification(message);
    setNotificationType(type);
    setTimeout(() => setNotification(null), 4000);
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
      setLastPinchDistance(getTouchDistance(e.touches[0], e.touches[1]));
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
          setZoomLevel(newZoomLevel);
          setLastPinchDistance(distance);
        }
      } else {
        setLastPinchDistance(distance);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      if (isPinching) showNotification(`Zoom: ${Math.round(zoomLevel * 100)}%`);
      setIsPinching(false);
      setLastPinchDistance(0);
    }
  };

  const checkTaskConflict = (taskId: string, newStartTime: number, duration: number, allTasks: Task[]) => {
    const taskEnd = newStartTime + duration;
    return allTasks.some((task) => {
      if (task.id === taskId) return false;
      const otherTaskEnd = task.startTime + task.duration;
      return newStartTime < otherTaskEnd && task.startTime < taskEnd;
    });
  };

  const handleDragStart = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setOriginalTaskPosition((prev) => ({ ...prev, [taskId]: task.startTime }));
    }
  }, [tasks]);

  const handleDragEnd = useCallback((taskId: string, info: PanInfo) => {
    const deltaX = info.offset.x;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (Math.abs(deltaX) > 20) {
      const hoursDelta = Math.round(deltaX / hourWidth);
      const newStartTime = Math.max(0, Math.min(24 - task.duration, task.startTime + hoursDelta));
      const originalStart = originalTaskPosition[taskId];

      if (checkTaskConflict(taskId, newStartTime, task.duration, tasks)) {
        if (originalStart !== undefined) {
          setTasks((prevTasks) => prevTasks.map((t) => t.id === taskId ? { ...t, startTime: originalStart } : t));
          showNotification(`Cannot move task - scheduling conflict detected`, "error");
        }
      } else if (newStartTime !== task.startTime) {
        setTasks((prevTasks) => prevTasks.map((t) => t.id === taskId ? { ...t, startTime: newStartTime } : t));
        showNotification(`"${task.title}" moved to ${formatTime(newStartTime)}`, "success");
      }
    }
    setOriginalTaskPosition((prev) => {
      const newPos = { ...prev };
      delete newPos[taskId];
      return newPos;
    });
  }, [tasks, hourWidth, originalTaskPosition]);

  const handleAddTask = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("medium");
    setNewTaskStartTimeStr("9");
    setNewTaskDurationStr("1");
    setShowAddDialog(true);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      showNotification("Please enter a task title", "error");
      return;
    }
    const startTime = newTaskStartTimeStr === "" || newTaskStartTimeStr === "0" ? 0 : Math.max(0, Math.min(23, parseInt(newTaskStartTimeStr) || 9));
    const duration = Math.max(0.5, Math.min(12, parseFloat(newTaskDurationStr) || 1));
    if (checkTaskConflict("", startTime, duration, tasks)) {
      showNotification(`Cannot create task - time slot is already occupied`, "error");
      return;
    }
    const newTask: Task = { id: Date.now().toString(), title: newTaskTitle.trim(), description: newTaskDescription.trim(), priority: newTaskPriority, startTime, duration, userId: Date.now().toString(), userName: "" };
    setTasks((prev) => [...prev, newTask]);
    setShowAddDialog(false);
    showNotification(`"${newTask.title}" created at ${formatTime(startTime)}`, "success");
  };

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowEditDialog(true);
  }, []);

  const handleUpdateTask = () => {
    if (!editingTask || !editingTask.title.trim()) {
      showNotification("Please enter a task title", "error");
      return;
    }
    if (checkTaskConflict(editingTask.id, editingTask.startTime, editingTask.duration, tasks)) {
      showNotification(`Cannot update task - time slot conflicts with existing tasks`, "error");
      return;
    }
    setTasks((prev) => prev.map((task) => (task.id === editingTask.id ? editingTask : task)));
    setShowEditDialog(false);
    setEditingTask(null);
    showNotification(`"${editingTask.title}" updated`, "success");
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setShowEditDialog(false);
    setEditingTask(null);
    showNotification("Task deleted", "success");
  };

  const zoomIn = () => setZoomLevel(z => Math.min(3, z + 0.25));
  const zoomOut = () => setZoomLevel(z => Math.max(0.5, z - 0.25));
  const resetZoom = () => setZoomLevel(1);

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap");
        * { font-family: 'Outfit'; }
        html, body { overscroll-behavior: none; -webkit-overflow-scrolling: touch; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
        * { -webkit-touch-callout: none; }
        .touch-manipulation { touch-action: manipulation; }
        .gradient-mesh { background: radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.1) 0px, transparent 0%), radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(354, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 0.1) 0px, transparent 50%), radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 0.1) 0px, transparent 50%), radial-gradient(at 79% 53%, hsla(343, 68%, 79%, 0.1) 0px, transparent 50%); }
        .clay-effect { background: linear-gradient(145deg, #f0f2f5, #e1e5ea); box-shadow: 8px 8px 16px rgba(174, 190, 205, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.8), inset 2px 2px 4px rgba(255, 255, 255, 0.6), inset -2px -2px 4px rgba(174, 190, 205, 0.3); border-radius: 20px; }
        .card-shadow { box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37), 0 2px 8px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.2); }
        .premium-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stunning-title { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); background-size: 200% 200%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 3s ease-in-out infinite; }
        @keyframes shimmer { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 12px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); }
        * { scrollbar-width: thin; scrollbar-color: rgba(102, 126, 234, 0.6) rgba(255, 255, 255, 0.1); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        @media (max-width: 768px) { ::-webkit-scrollbar { width: 6px; height: 6px; } }
      `}</style>

      <div className="gradient-mesh flex flex-col h-screen" style={{ background: `linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%), linear-gradient(45deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%), #fafbff` }}>
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex-shrink-0 z-50 clay-effect border-b border-slate-200/20 px-4 md:px-6 py-4 md:py-6">
          <div className="max-w-7xl mx-auto">
            {isMobile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center"><motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8, type: "spring", stiffness: 100 }} className="text-xl font-black stunning-title" style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Timeline Pro</motion.h1></div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg"><FiClock className="w-3 h-3 text-white" /></div>
                  <div className="text-xs text-slate-600"><span className="font-bold text-slate-800">{tasks.length}</span><span className="mx-1">tasks</span><span className="text-slate-500">• Tap to edit • Drag to move</span></div>
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="relative flex-1">
                  <motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8, type: "spring", stiffness: 100 }} className="text-2xl md:text-3xl font-black stunning-title mb-1 relative" style={{ fontWeight: 900, letterSpacing: "-0.02em" }}><span>Timeline</span><span> Pro</span></motion.h1>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="flex items-center gap-4 mt-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg"><FiClock className="w-4 h-4 text-white" /></div>
                    <div className="text-sm text-slate-600"><span className="font-bold text-slate-800">{tasks.length}</span><span className="mx-2">active tasks</span><span className="text-xs text-slate-500">• Drag to reschedule • Pinch to zoom</span></div>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -50, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }} exit={{ opacity: 0, y: -50, scale: 0.8, transition: { duration: 0.2 } }} className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[110] clay-effect border border-slate-200/20 rounded-2xl px-6 py-4 card-shadow text-sm font-medium text-slate-800 max-w-sm text-center">
              <div className="flex items-center justify-center gap-2">
                {notificationType === "success" && <IoCheckmarkCircle className="w-4 h-4 text-green-500" />}
                {notificationType === "error" && <IoAlert className="w-4 h-4 text-red-500" />}
                {notificationType === "info" && <FiClock className="w-4 h-4 text-blue-500" />}
                <span>{notification}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 relative">
          <div
            ref={timelineRef}
            className="absolute inset-0 overflow-auto scroll-smooth pb-20"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="sticky top-0 z-40 border-b border-white/10 shadow-lg" style={{ position: "-webkit-sticky", background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
              <div className="flex">
                {hours.map((hour) => (
                  <div key={hour} className="flex flex-col items-center justify-center py-4 border-r border-white/10 transition-all duration-200 shrink-0 bg-white/95" style={{ minWidth: `${hourWidth}px`, width: `${hourWidth}px` }}>
                    <div className="text-sm font-bold text-slate-800 mb-1">{hour.toString().padStart(2, "0")}:00</div>
                    <div className="text-xs text-slate-500 font-medium">{hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}</div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className={`relative ${isMobile ? "p-3" : "p-6"}`}
              style={{ width: `${24 * hourWidth}px`, minHeight: "500px" }}
            >
              <div className="absolute inset-0 pointer-events-none">
                {hours.map((hour) => (<div key={`grid-${hour}`} className="absolute top-0 bottom-0 w-px bg-gray-200/50" style={{ left: `${hour * hourWidth + (isMobile ? 12 : 24)}px` }} />))}
              </div>
              <div className={`${isMobile ? "space-y-3" : "space-y-4"}`}>
                <AnimatePresence>
                  {sortedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isConflicted={conflictIdSet.has(task.id)}
                      hourWidth={hourWidth}
                      isMobile={isMobile}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={handleEditTask}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {showAddDialog && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-[100]" onClick={() => setShowAddDialog(false)} />
              <motion.div initial={{ x: isMobile ? 0 : "100%", y: isMobile ? "-100%" : 0 }} animate={{ x: 0, y: 0 }} exit={{ x: isMobile ? 0 : "100%", y: isMobile ? "-100%" : 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className={clsx("fixed z-[101] clay-effect flex flex-col", isMobile ? "inset-x-4 top-8 bottom-8 rounded-3xl" : "top-4 right-4 bottom-4 w-[450px] rounded-3xl")} style={{ maxHeight: isMobile ? "calc(100vh - 4rem)" : "calc(100vh - 2rem)" }}>
                <div className="flex flex-col h-full">
                  <div className="p-8 pb-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center"><IoAdd className="w-5 h-5 text-white" /></div>Add New Task</h2>
                        <p className="text-sm text-slate-500">Create a new task for your timeline</p>
                      </div>
                      <motion.button whileHover={{ scale: 1.1, backgroundColor: "rgba(248, 250, 252, 1)" }} whileTap={{ scale: 0.9 }} onClick={() => setShowAddDialog(false)} className="w-10 h-10 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200"><IoClose className="w-5 h-5" /></motion.button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-8">
                    <div className="space-y-6 pb-4">
                      <div><label className="block text-sm font-bold text-slate-700 mb-3">Task Title</label><input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800 placeholder-slate-400" placeholder="Enter task title..." /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-3">Description</label><textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={3} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none resize-none transition-all bg-white/50 text-slate-800 placeholder-slate-400" placeholder="Task description..." /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-3">Priority</label><select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as "low" | "medium" | "high")} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"><option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option></select></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-slate-700 mb-3">Start Time</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={newTaskStartTimeStr} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 23)) setNewTaskStartTimeStr(v); }} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800" placeholder="0-23" /></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-3">Duration (hrs)</label><input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" value={newTaskDurationStr} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); if (v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) <= 12)) setNewTaskDurationStr(v); }} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800" placeholder="0.5-12" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-slate-200/50 p-8 pt-6">
                    <div className="flex gap-4">
                      <motion.button whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} whileTap={{ scale: 0.98 }} onClick={() => setShowAddDialog(false)} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all duration-200">Cancel</motion.button>
                      <motion.button whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(102, 126, 234, 0.35)" }} whileTap={{ scale: 0.98 }} onClick={handleCreateTask} className="flex-1 py-4 premium-gradient text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2"><IoCheckmarkCircle className="w-5 h-5" />Create Task</motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
          {showEditDialog && editingTask && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-[100]" onClick={() => setShowEditDialog(false)} />
              <motion.div initial={{ x: isMobile ? 0 : "100%", y: isMobile ? "-100%" : 0 }} animate={{ x: 0, y: 0 }} exit={{ x: isMobile ? 0 : "100%", y: isMobile ? "-100%" : 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className={clsx("fixed z-[101] clay-effect flex flex-col", isMobile ? "inset-x-4 top-8 bottom-8 rounded-3xl" : "top-4 right-4 bottom-4 w-[450px] rounded-3xl")} style={{ maxHeight: isMobile ? "calc(100vh - 4rem)" : "calc(100vh - 2rem)" }}>
                <div className="flex flex-col h-full">
                  <div className="p-8 pb-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"><FiEdit3 className="w-5 h-5 text-white" /></div>Edit Task</h2>
                        <p className="text-sm text-slate-500">Modify your task details</p>
                      </div>
                      <motion.button whileHover={{ scale: 1.1, backgroundColor: "rgba(248, 250, 252, 1)" }} whileTap={{ scale: 0.9 }} onClick={() => setShowEditDialog(false)} className="w-10 h-10 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200"><IoClose className="w-5 h-5" /></motion.button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-8">
                    <div className="space-y-6 pb-4">
                      <div><label className="block text-sm font-bold text-slate-700 mb-3">Task Title</label><input type="text" value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800 placeholder-slate-400" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-3">Description</label><textarea value={editingTask.description || ""} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} rows={3} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none resize-none transition-all bg-white/50 text-slate-800 placeholder-slate-400" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-3">Priority</label><select value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as "low" | "medium" | "high" })} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800"><option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option></select></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-slate-700 mb-3">Start Time</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={editingTask.startTime.toString()} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 23)) setEditingTask({ ...editingTask, startTime: v === "" ? 0 : parseInt(v) }); }} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800" placeholder="0-23" /></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-3">Duration (hrs)</label><input type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" value={editingTask.duration.toString()} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); if (v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) <= 12)) setEditingTask({ ...editingTask, duration: parseFloat(v) || 0.5 }); }} className="w-full p-4 border border-slate-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white/50 text-slate-800" placeholder="0.5-12" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-slate-200/50 p-8 pt-6">
                    <div className="flex gap-3">
                      <motion.button whileHover={{ scale: 1.05, boxShadow: "0 4px 20px rgba(239, 68, 68, 0.25)" }} whileTap={{ scale: 0.95 }} onClick={() => handleDeleteTask(editingTask.id)} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2"><IoTrash className="w-4 h-4" />Delete</motion.button>
                      <motion.button whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(102, 126, 234, 0.35)" }} whileTap={{ scale: 0.98 }} onClick={handleUpdateTask} className="flex-1 py-4 premium-gradient text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2"><IoCheckmarkCircle className="w-5 h-5" />Update</motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className={`fixed ${isMobile ? "bottom-4 left-4 gap-2" : "bottom-6 left-6 gap-3"} flex items-center z-50`}>
          <motion.button whileHover={{ scale: 1.1, boxShadow: "0 8px 25px rgba(102, 126, 234, 0.25)" }} whileTap={{ scale: 0.9 }} onClick={zoomOut} className={clsx("clay-effect border border-slate-200/20 rounded-full flex items-center justify-center text-slate-700 font-bold card-shadow touch-manipulation transition-all duration-200", isMobile ? "w-12 h-12 text-base" : "w-14 h-14 text-lg")}><MdZoomOut /></motion.button>
          {!isMobile && (<motion.div whileHover={{ scale: 1.05 }} className="clay-effect border border-slate-200/20 rounded-full px-5 py-3 text-sm font-bold text-slate-700 card-shadow">{Math.round(zoomLevel * 100)}%</motion.div>)}
          {zoomLevel !== 1 && (<motion.button whileHover={{ scale: 1.1, boxShadow: "0 8px 25px rgba(34, 197, 94, 0.25)" }} whileTap={{ scale: 0.9 }} onClick={resetZoom} className={clsx("clay-effect border border-slate-200/20 rounded-full flex items-center justify-center text-slate-700 font-bold card-shadow touch-manipulation transition-all duration-200", isMobile ? "w-12 h-12 text-base" : "w-14 h-14 text-lg")}><IoRefresh /></motion.button>)}
          <motion.button whileHover={{ scale: 1.1, boxShadow: "0 8px 25px rgba(147, 51, 234, 0.25)" }} whileTap={{ scale: 0.9 }} onClick={zoomIn} className={clsx("clay-effect border border-slate-200/20 rounded-full flex items-center justify-center text-slate-700 font-bold card-shadow touch-manipulation transition-all duration-200", isMobile ? "w-12 h-12 text-base" : "w-14 h-14 text-lg")}><MdZoomIn /></motion.button>
          {isMobile && zoomLevel !== 1 && (<motion.div whileHover={{ scale: 1.05 }} className="clay-effect border border-slate-200/20 rounded-full px-4 py-2 text-xs font-bold text-slate-700 card-shadow">{Math.round(zoomLevel * 100)}%</motion.div>)}
        </motion.div>

        <motion.button initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} whileHover={{ scale: 1.05, boxShadow: "0 12px 35px rgba(102, 126, 234, 0.4)" }} whileTap={{ scale: 0.95 }} onClick={handleAddTask} className={clsx("fixed premium-gradient text-white flex items-center justify-center gap-3 card-shadow touch-manipulation transition-all duration-300 z-50 font-semibold", isMobile ? "bottom-4 right-4 w-14 h-14 rounded-full shadow-2xl" : "bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl hover:shadow-3xl")} style={{ boxShadow: `0 8px 32px rgba(102, 126, 234, 0.3), 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)` }}>
          <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3, ease: "easeInOut" }}><IoAdd className={isMobile ? "w-6 h-6" : "w-5 h-5"} /></motion.div>
          {!isMobile && (<span className="text-sm font-semibold">Create Task</span>)}
        </motion.button>
      </div>
    </>
  );
};

export default TimelineEditor;