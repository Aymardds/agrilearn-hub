import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, BookOpen, CheckCircle, AlertCircle, Info } from "lucide-react";

interface InteractiveContentProps {
  content: string;
  interactiveElements?: {
    type: "accordion" | "tabs" | "highlight" | "quiz-preview";
    data: any;
  }[];
}

const InteractiveContent = ({ content, interactiveElements = [] }: InteractiveContentProps) => {
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const markSectionComplete = (sectionId: string) => {
    setCompletedSections((prev) => new Set(prev).add(sectionId));
  };

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
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
            return (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {element.data.type === "tip" && <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />}
                    {element.data.type === "warning" && <AlertCircle className="w-5 h-5 text-orange-500 mt-1" />}
                    {element.data.type === "info" && <Info className="w-5 h-5 text-blue-500 mt-1" />}
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">
                        {element.data.type === "tip" && "Astuce"}
                        {element.data.type === "warning" && "Attention"}
                        {element.data.type === "info" && "Information"}
                      </Badge>
                      <p className="text-sm">{element.data.content}</p>
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

