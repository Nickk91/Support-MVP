// src/components/BotEditDialog/steps/BotBehaviorSettings.jsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { useState } from "react";

// Template definitions (could be moved to a constants file)
const PERSONALITY_TEMPLATES = {
  professional: {
    name: "Professional",
    description: "Formal, reliable, and business-appropriate",
    icon: "💼",
    systemMessage: `You are {botName}, a professional and knowledgeable assistant.

KEY BEHAVIORS:
- Use formal but approachable business language
- Structure responses with clear, logical flow
- Focus on accuracy and reliability above all
- Maintain professional boundaries while being helpful
- Admit knowledge limits honestly and promptly

RESPONSE STYLE:
- Concise but thorough (2-4 sentences typically)
- Use proper grammar and professional tone
- Avoid slang, emojis, and overly casual language
- Provide actionable insights with clear rationale`,

    greeting: "Hello! I'm {botName}. How may I help you today?",
  },

  friendly: {
    name: "Friendly Assistant",
    description: "Warm, approachable, and conversational",
    icon: "😊",
    systemMessage: `You are {botName}, a warm and friendly assistant.

KEY BEHAVIORS:  
- Use conversational, approachable language
- Show genuine empathy and understanding
- Be encouraging and positive in interactions
- Use occasional appropriate emojis to build rapport 😊
- Make users feel heard and supported

RESPONSE STYLE:
- Warm, personable tone with natural flow
- Use contractions for casual feel ("you'll", "we've")
- Keep responses engaging but focused on solutions
- Show authentic interest in helping users succeed`,

    greeting:
      "Hi there! I'm {botName} 👋 So glad you're here! How can I help you today?",
  },

  technical: {
    name: "Technical Expert",
    description: "Precise, detailed, and solution-oriented",
    icon: "🔧",
    systemMessage: `You are {botName}, a technical expert and problem-solver.

KEY BEHAVIORS:
- Explain complex concepts with clarity and precision
- Provide step-by-step guidance for technical issues
- Use accurate terminology without unnecessary jargon
- Focus on practical, implementable solutions
- Validate understanding when explaining complex topics

RESPONSE STYLE:  
- Clear, structured explanations with logical progression
- Technical accuracy is paramount - never guess
- Break down complex topics into digestible parts
- Provide actionable technical guidance with examples`,

    greeting:
      "Hello, I'm {botName}, your technical specialist. What challenge can I help you solve today?",
  },

  custom: {
    name: "Custom Personality",
    description: "Build your own from scratch",
    icon: "⚙️",
    systemMessage: `You are {botName}, an AI assistant.

CUSTOMIZE YOUR ASSISTANT'S BEHAVIOR:

ROLE & IDENTITY:
• Who is this assistant? What's their expertise?
• What persona should they project?

KEY BEHAVIORS:
• How should they interact with users?
• What communication style should they use?
• Any specific dos and don'ts?

RESPONSE STYLE:
• Preferred tone (professional, casual, enthusiastic, etc.)
• Response length preferences
• Use of emojis, formatting, or other stylistic elements

KNOWLEDGE & LIMITATIONS:
• How to handle unknown information?
• Any topics to avoid or emphasize?`,

    greeting: "Hello! I'm {botName}. How can I help you?",
  },
};

const SAFETY_TEMPLATES = {
  lenient: {
    name: "Flexible",
    description: "Balanced approach with general knowledge fallback",
    icon: "🟢",
    guardrails: `FLEXIBLE GUIDELINES:
- Use general knowledge when specific documentation is unavailable
- Provide helpful guidance while clearly noting limitations  
- Use common sense and reasonable judgment in responses
- Maintain basic ethical standards and user privacy
- Be transparent about knowledge boundaries and sources`,
  },

  standard: {
    name: "Standard Safety",
    description: "Professional boundaries with clear limits",
    icon: "🟡",
    guardrails: `SAFETY & COMPLIANCE:
- Do not provide medical, financial, or legal advice
- Do not generate harmful, unethical, or discriminatory content
- Maintain user privacy and confidentiality at all times
- Stay within your designated knowledge domain
- Escalate sensitive issues to human support when appropriate`,
  },

  strict: {
    name: "Strict Compliance",
    description: "Only answers from provided documents",
    icon: "🔴",
    guardrails: `STRICT COMPLIANCE MODE:
- ONLY answer questions directly related to the provided documentation
- IMMEDIATELY redirect any medical, financial, legal, or personal advice requests
- Do not speculate, hypothesize, or provide opinions beyond the given context
- Strictly maintain professional boundaries at all times
- Automatically escalate any ambiguous or sensitive queries to human support`,
  },

  custom: {
    name: "Custom Safety Rules",
    description: "Define your own safety guidelines",
    icon: "⚙️",
    guardrails: `CUSTOM SAFETY & COMPLIANCE RULES:

Define your specific safety requirements below:

RESTRICTED CONTENT:
• What topics should be avoided completely?
• What type of advice is prohibited?
• Any industry-specific compliance requirements?

CONTENT BOUNDARIES:
• What constitutes acceptable vs unacceptable content?
• Any tone or language restrictions?
• Privacy and confidentiality requirements?

KNOWLEDGE LIMITS:
• Should the AI use general knowledge?
• How to handle questions outside provided docs?
• When to admit knowledge limits?`,
  },
};

export default function BotBehaviorSettings({ bot, onChange }) {
  const [showAdvancedPersonality, setShowAdvancedPersonality] = useState(false);
  const [showAdvancedSafety, setShowAdvancedSafety] = useState(false);

  // Determine current template based on existing content
  const getCurrentPersonality = () => {
    const systemMessage = bot?.systemMessage || "";
    for (const [key, template] of Object.entries(PERSONALITY_TEMPLATES)) {
      const templateCore = template.systemMessage
        .split("KEY BEHAVIORS:")[0]
        .trim();
      if (
        systemMessage.includes(
          templateCore.replace(/{botName}/g, bot?.botName || "")
        )
      ) {
        return key;
      }
    }
    return "custom";
  };

  const getCurrentSafety = () => {
    const guardrails = bot?.guardrails || "";
    for (const [key, template] of Object.entries(SAFETY_TEMPLATES)) {
      const templateCore = template.guardrails.split("\n")[0].trim();
      if (guardrails.includes(templateCore)) {
        return key;
      }
    }
    return "custom";
  };

  const [selectedPersonality, setSelectedPersonality] = useState(
    getCurrentPersonality()
  );
  const [selectedSafety, setSelectedSafety] = useState(getCurrentSafety());

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  const handleEscalationChange = (updates) => {
    onChange({
      escalation: {
        ...bot?.escalation,
        ...updates,
      },
    });
  };

  const handlePersonalityChange = (personalityKey) => {
    setSelectedPersonality(personalityKey);
    const template = PERSONALITY_TEMPLATES[personalityKey];

    if (personalityKey !== "custom") {
      const systemMessage = template.systemMessage.replace(
        /{botName}/g,
        bot?.botName || "YourBot"
      );
      handleChange("systemMessage", systemMessage);

      // Also update greeting if it's empty or matches a template
      if (
        !bot?.greeting ||
        bot.greeting ===
          PERSONALITY_TEMPLATES[getCurrentPersonality()]?.greeting
      ) {
        handleChange(
          "greeting",
          template.greeting.replace(/{botName}/g, bot?.botName || "YourBot")
        );
      }
    }
  };

  const handleSafetyChange = (safetyKey) => {
    setSelectedSafety(safetyKey);
    const template = SAFETY_TEMPLATES[safetyKey];

    if (safetyKey !== "custom") {
      handleChange("guardrails", template.guardrails);
    }
  };

  return (
    <div className="space-y-6">
      {/* Personality Section */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-lg font-semibold">Personality Style</Label>
            <p className="text-sm text-muted-foreground">
              Choose how your assistant behaves and communicates
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedPersonality(!showAdvancedPersonality)}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {showAdvancedPersonality ? "Hide Advanced" : "Advanced"}
            {showAdvancedPersonality ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!showAdvancedPersonality ? (
          /* Template Selection View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PERSONALITY_TEMPLATES).map(([key, template]) => (
              <div
                key={key}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPersonality === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handlePersonalityChange(key)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* <div className="p-3 bg-gray-50 rounded text-sm">
                  <div className="text-gray-500 text-xs mb-1">
                    Sample greeting:
                  </div>
                  <div>
                    {template.greeting.replace(
                      /{botName}/g,
                      bot?.botName || "YourBot"
                    )}
                  </div>
                </div> */}
              </div>
            ))}
          </div>
        ) : (
          /* Advanced Editor View */
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Label className="font-medium">Start with template:</Label>
              <select
                value={selectedPersonality}
                onChange={(e) => handlePersonalityChange(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                {Object.entries(PERSONALITY_TEMPLATES).map(
                  ([key, template]) => (
                    <option key={key} value={key}>
                      {template.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemMessage">System Message</Label>
              <Textarea
                id="systemMessage"
                value={bot?.systemMessage || ""}
                onChange={(e) => handleChange("systemMessage", e.target.value)}
                placeholder="Define your assistant's personality and behavior..."
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                This message defines the bot's personality and primary behavior.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Safety Section */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label className="text-lg font-semibold">Safety & Boundaries</Label>
            <p className="text-sm text-muted-foreground">
              Set rules to keep your bot safe and compliant
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedSafety(!showAdvancedSafety)}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {showAdvancedSafety ? "Hide Advanced" : "Advanced"}
            {showAdvancedSafety ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!showAdvancedSafety ? (
          /* Template Selection View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(SAFETY_TEMPLATES).map(([key, template]) => (
              <div
                key={key}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedSafety === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleSafetyChange(key)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Advanced Editor View */
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Label className="font-medium">Start with template:</Label>
              <select
                value={selectedSafety}
                onChange={(e) => handleSafetyChange(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                {Object.entries(SAFETY_TEMPLATES).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardrails">Guardrails & Restrictions</Label>
              <Textarea
                id="guardrails"
                value={bot?.guardrails || ""}
                onChange={(e) => handleChange("guardrails", e.target.value)}
                placeholder="Rules and restrictions to keep your bot safe and on-brand..."
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Rules and restrictions to keep your bot safe and on-brand
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fallback Message */}
      <div className="space-y-2">
        <Label htmlFor="fallback">Fallback Message</Label>
        <Textarea
          id="fallback"
          value={bot?.fallback || ""}
          onChange={(e) => handleChange("fallback", e.target.value)}
          placeholder="I'm sorry, I don't have enough information to answer that question. Please contact our support team for assistance."
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          Message shown when the bot cannot find relevant information in your
          documents.
        </p>
      </div>

      {/* Human Escalation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="escalation">Human Escalation</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to request human support when needed
            </p>
          </div>
          <Switch
            id="escalation"
            checked={bot?.escalation?.enabled || false}
            onCheckedChange={(enabled) => handleEscalationChange({ enabled })}
          />
        </div>

        {bot?.escalation?.enabled && (
          <div className="space-y-2 pl-4 border-l-2">
            <Label htmlFor="escalationEmail">Escalation Email</Label>
            <Input
              id="escalationEmail"
              type="email"
              value={bot?.escalation?.escalation_email || ""}
              onChange={(e) =>
                handleEscalationChange({ escalation_email: e.target.value })
              }
              placeholder="support@company.com"
            />
            <p className="text-sm text-muted-foreground">
              Email where escalation requests will be sent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
