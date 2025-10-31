// client\src\constants\safetyTemplates.js
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

    fallback:
      "I don't have enough specific information to answer that question, but based on general knowledge:",

    templateGuide: `Customize flexible safety guidelines. Consider:
• Knowledge Boundaries: When to use general knowledge?
• Transparency: How to communicate limitations?
• Judgment: What level of discretion should the AI have?`,
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

    fallback:
      "I'm sorry, I don't have enough information in my knowledge base to answer that question accurately.",

    templateGuide: `Customize standard safety rules. Key areas:
• Restricted Topics: What specific advice to avoid?
• Content Boundaries: What constitutes harmful content?
• Privacy: What confidentiality standards to maintain?
• Escalation: When to suggest human help?`,
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

    fallback:
      "I can only answer questions based on the provided documentation, and I don't have relevant information for this question.",

    templateGuide: `Customize strict compliance rules. Consider:
• Scope: What exactly counts as "provided documentation"?
• Redirection: How to handle off-topic questions?
• Speculation: What constitutes unacceptable speculation?
• Escalation: Clear triggers for human support`,
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

    fallback:
      "I'm not able to answer that question with the information available to me.",

    templateGuide: `Build your custom safety rules from scratch.

KEY AREAS TO COVER:
1. Restricted Content - What to absolutely avoid
2. Knowledge Boundaries - Limits on AI knowledge usage  
3. Professional Standards - Privacy, ethics, compliance
4. Escalation Triggers - When to involve humans

TIPS:
• Be specific about prohibited content
• Define clear escalation criteria
• Consider industry regulations if applicable
• Test with edge cases to ensure coverage`,
  },
};

export default SAFETY_TEMPLATES;
