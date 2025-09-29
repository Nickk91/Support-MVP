import { useWizardStore } from "../../../store/wizardStore";
import { Button } from "@/components/ui/button";
import StepActions from "../../../components/ui/StepActions/StepActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function StepBotBasics() {
  const { values, update, next, prev } = useWizardStore();

  return (
    <>
      <h3 className="text-lg font-semibold mb-3">🤖 Bot Basics</h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Bot Name */}
        <div className="grid gap-1">
          <Label htmlFor="botName">Bot Name</Label>
          <Input
            id="botName"
            value={values.botName}
            onChange={(e) => update({ botName: e.target.value })}
            placeholder="e.g., Ragmate Assistant"
          />
        </div>

        {/* Personality (shadcn Select) */}
        <div className="grid gap-1">
          <Label>Personality</Label>
          <Select
            value={values.personality}
            onValueChange={(v) => update({ personality: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a personality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Friendly">Friendly</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Technical">Technical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Model (shadcn Select) */}
        <div className="grid gap-1">
          <Label>Model</Label>
          <Select
            value={values.model}
            onValueChange={(v) => update({ model: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="claude-3-5-sonnet">
                Claude 3.5 Sonnet
              </SelectItem>
              <SelectItem value="llama-3.1-70b">Llama 3.1 70B</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <StepActions>
        {/* shadcn variants: default, secondary, outline, destructive, ghost, link */}
        <Button variant="outline" onClick={prev}>
          Back
        </Button>
        <Button onClick={next}>Next</Button>
      </StepActions>
    </>
  );
}
