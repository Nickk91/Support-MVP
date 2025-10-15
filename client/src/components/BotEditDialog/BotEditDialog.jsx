// src/components/BotEditDialog/BotEditDialog.jsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import BotBasicSettings from "./BotBasicSettings";
import BotBehaviorSettings from "./BotBehaviorSettings";
import BotKnowledgeSettings from "./BotKnowledgeSettings";
import BotAdvancedSettings from "./BotAdvancedSettings";

export default function BotEditDialog({ bot, open, onOpenChange, onSave }) {
  const isNew = !bot;
  const [formData, setFormData] = useState(bot || {});

  const handleSave = () => {
    // Here you would typically validate and save the data
    onSave(formData);
  };

  const updateFormData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Create New Bot" : `Edit ${bot.botName}`}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BotBasicSettings bot={formData} onChange={updateFormData} />
          </TabsContent>

          <TabsContent value="behavior">
            <BotBehaviorSettings bot={formData} onChange={updateFormData} />
          </TabsContent>

          <TabsContent value="knowledge">
            <BotKnowledgeSettings bot={formData} onChange={updateFormData} />
          </TabsContent>

          <TabsContent value="advanced">
            <BotAdvancedSettings bot={formData} onChange={updateFormData} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isNew ? "Create Bot" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
