import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, BookOpen, CheckCircle, AlertCircle, Info, XCircle, RotateCcw, Settings } from "lucide-react";

interface InteractiveContentProps {
  content: string;
  interactiveElements?: {
    type: "accordion" | "tabs" | "highlight" | "quiz-preview";
    data: any;
  }[];
}

const InteractiveContent = ({ content, interactiveElements = [] }: InteractiveContentProps) => {
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const processContent = (html: string) => {
    if (!html || !html.trim()) return null;

    // A more robust approach: Find paragraphs starting with emojis using regex
    // We'll search for <p> tags that start with one of our markers
    const markers = ["💡", "🚫", "🔁", "⚙️"];

    // If no markers at all, just render everything as one block
    const hasAnyMarker = markers.some(m => html.includes(m));
    if (!hasAnyMarker) {
      return (
        <div
          className="prose prose-lg max-w-none mb-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // Split by paragraph but keep the tags to avoid losing non-p content
    const parts = html.split(/(?=<p>)/g);

    const renderedParts = parts.map((part, index) => {
      const getHighlightConfig = (text: string) => {
        const plainText = text.replace(/<[^>]*>/g, "").trim();
        if (plainText.startsWith("💡")) return { type: "tip", icon: <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />, label: "Astuce", color: "border-l-yellow-500 bg-yellow-50/50", strip: "💡" };
        if (plainText.startsWith("🚫")) return { type: "warning", icon: <XCircle className="w-5 h-5 text-red-500 mt-1" />, label: "À éviter", color: "border-l-red-500 bg-red-50/50", strip: "🚫" };
        if (plainText.startsWith("🔁")) return { type: "practice", icon: <RotateCcw className="w-5 h-5 text-green-500 mt-1" />, label: "Bonnes pratiques", color: "border-l-green-500 bg-green-50/50", strip: "🔁" };
        if (plainText.startsWith("⚙️")) return { type: "recommendation", icon: <Settings className="w-5 h-5 text-blue-500 mt-1" />, label: "Recommandation", color: "border-l-blue-500 bg-blue-50/50", strip: "⚙️" };
        return null;
      };

      const config = getHighlightConfig(part);

      if (config) {
        // Remove the emoji from the display text
        const displayText = part.replace(config.strip, "").trim();

        return (
          <Card key={`content-${index}`} className={cn("border-l-4 my-4", config.color)}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {config.icon}
                <div className="flex-1">
                  <Badge variant="outline" className="mb-2 bg-background">
                    {config.label}
                  </Badge>
                  <div
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: displayText }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      // If it's a non-empty part, render it as is
      if (part.trim()) {
        return (
          <div
            key={`content-${index}`}
            className="prose prose-lg max-w-none mb-4"
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      }
      return null;
    }).filter(Boolean);

    // If for some reason we filtered everything out, show the original
    if (renderedParts.length === 0) {
      return (
        <div
          className="prose prose-lg max-w-none mb-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return renderedParts;
  };

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {processContent(content)}
        </CardContent>
      </Card>

      {/* Interactive Elements */}
      {interactiveElements.map((element, index) => {
        switch (element.type) {
          case "accordion":
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Points clés à retenir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {element.data.map((item: any, idx: number) => (
                      <AccordionItem key={idx} value={`item-${idx}`}>
                        <AccordionTrigger>{item.title}</AccordionTrigger>
                        <AccordionContent>{item.content}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );

          case "tabs":
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Contenu détaillé</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={element.data[0]?.id} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      {element.data.map((tab: any) => (
                        <TabsTrigger key={tab.id} value={tab.id}>
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {element.data.map((tab: any) => (
                      <TabsContent key={tab.id} value={tab.id} className="mt-4">
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: tab.content }}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            );

          case "highlight":
            const getHighlightConfig = (type: string) => {
              switch (type) {
                case "tip": return { icon: <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />, label: "Astuce", color: "border-l-yellow-500 bg-yellow-50/50" };
                case "warning": return { icon: <XCircle className="w-5 h-5 text-red-500 mt-1" />, label: "À éviter", color: "border-l-red-500 bg-red-50/50" };
                case "practice": return { icon: <RotateCcw className="w-5 h-5 text-green-500 mt-1" />, label: "Bonnes pratiques", color: "border-l-green-500 bg-green-50/50" };
                case "recommendation": return { icon: <Settings className="w-5 h-5 text-blue-500 mt-1" />, label: "Recommandation", color: "border-l-blue-500 bg-blue-50/50" };
                default: return { icon: <Info className="w-5 h-5 text-blue-500 mt-1" />, label: "Information", color: "border-l-primary bg-primary/5" };
              }
            };
            const config = getHighlightConfig(element.data.type);
            return (
              <Card key={index} className={cn("border-l-4", config.color)}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {config.icon}
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2 bg-background">
                        {config.label}
                      </Badge>
                      <div
                        className="text-sm prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: element.data.content }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );

          case "quiz-preview":
            return (
              <Card key={index} className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Quiz de révision
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Testez vos connaissances avec ce quiz rapide
                  </p>
                  <div className="space-y-2">
                    {element.data.questions?.slice(0, 2).map((q: any, qIdx: number) => (
                      <div key={qIdx} className="p-3 bg-background rounded-lg border">
                        <p className="font-medium text-sm mb-2">{q.question}</p>
                        <div className="space-y-1">
                          {q.options?.map((opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className="text-xs p-2 rounded bg-muted/50"
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    Passer le quiz complet
                  </Button>
                </CardContent>
              </Card>
            );

          default:
            return null;
        }
      })}

      {/* Section Completion Tracking */}
      {completedSections.size > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">
                {completedSections.size} section(s) complétée(s)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InteractiveContent;

