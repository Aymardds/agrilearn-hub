import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, PlayCircle, FileText, Video, ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LessonSidebarProps {
    courseStructure: any[];
    currentLessonId?: string;
    courseId?: string;
    lessonProgress?: any[];
    courseTitle?: string;
}

const LessonSidebar = ({
    courseStructure,
    currentLessonId,
    courseId,
    lessonProgress,
    courseTitle
}: LessonSidebarProps) => {
    const navigate = useNavigate();
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(courseStructure?.map(m => m.id) || []));

    const toggleModule = (moduleId: string) => {
        const newSet = new Set(expandedModules);
        if (newSet.has(moduleId)) {
            newSet.delete(moduleId);
        } else {
            newSet.add(moduleId);
        }
        setExpandedModules(newSet);
    };

    const isLessonCompleted = (lessonId: string) => {
        return lessonProgress?.some(p => p.lesson_id === lessonId && p.is_completed);
    };

    const getLessonIcon = (lessonType: string, completed: boolean) => {
        if (completed) return <CheckCircle className="w-4 h-4 text-green-500" />;
        switch (lessonType) {
            case "video": return <PlayCircle className="w-4 h-4" />;
            case "live": return <Video className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-r">
            <div className="p-6 border-b">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">TABLE DES MATIÈRES</h2>
                <p className="font-bold text-gray-900 line-clamp-2">{courseTitle}</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-0">
                    {courseStructure?.sort((a, b) => a.order_index - b.order_index).map((module, moduleIndex) => (
                        <div key={module.id} className="border-b last:border-b-0">
                            <button
                                onClick={() => toggleModule(module.id)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <span className="text-[10px] font-bold text-gray-400">PARTIE {moduleIndex + 1}</span>
                                    <span className="font-bold text-sm text-gray-700">{module.title}</span>
                                </div>
                                {expandedModules.has(module.id) ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </button>

                            {expandedModules.has(module.id) && (
                                <div className="bg-white">
                                    {module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => {
                                        const isActive = lesson.id === currentLessonId;
                                        const completed = isLessonCompleted(lesson.id);

                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-6 py-4 text-sm transition-all border-l-4",
                                                    isActive
                                                        ? "bg-blue-50 border-blue-600 text-blue-700 font-semibold"
                                                        : "bg-white border-transparent text-gray-600 hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="shrink-0">
                                                    {getLessonIcon(lesson.lesson_type, completed)}
                                                </div>
                                                <span className="flex-1 text-left line-clamp-2">{lesson.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default LessonSidebar;
