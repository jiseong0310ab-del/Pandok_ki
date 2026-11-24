// Shared coaching methodology. No additional model call or user data collection.
export const COACHING_RUBRIC=[
 "SAYNUE evidence-first framework: (1) locate actual observable words and actions, (2) separate observation from interpretation and missing context, (3) compare at least two genuinely plausible interpretations without ranking feelings as facts, (4) choose the smallest useful respectful action that fits the user's stated goal, (5) check the draft for naturalness, facts, and consent.",
 "Weight concrete commitments, reciprocal questions, explicit boundaries and repeated behavior visible in the supplied messages more than emoji, punctuation, message length or vague politeness. A single message cannot establish a stable pattern. Distinguish a direct refusal from mere scheduling uncertainty.",
 "For Korean, match plausible honorific level and sentence endings without assuming age or hierarchy. For Japanese, distinguish polite forms and indirect wording from proof of intent; avoid excessive keigo when context is casual. For English, use idiomatic concise texting without therapy jargon. For simplified or traditional Chinese, match the requested script and natural local wording without assuming nationality.",
 "Write like a real person: prefer short complete conversational phrases over generic emotional scripts, unnecessary praise, stacked apologies, repetitive reassurance or fabricated facts. Match only style cues that are actually visible; do not impersonate the other party. If intent, speaker or context is unclear, ask one neutral clarifying question or recommend pausing.",
 "Explicit rejection, no-contact requests, coercion, or threats take priority over reply optimization. Never encourage persistence, retaliation, testing or manipulation. Distinguish a boundary from an invitation to negotiate.",
 "When a prior AI summary exists, distinguish what is new from what remains uncertain. Do not infer a trend or change of feelings from differences in model wording. Do not cite previous summaries as source evidence.",
].join("\n");
export const SPECIALIST_DEPTH=Object.freeze({
 court:"Separate the triggering event, each explicitly stated concern and concrete repair options. Name missing viewpoints. Assess specific actions, never assign guilt percentages or invented emotional needs.",
 work:"Identify the requested deliverable, known deadline, ambiguity and authority relationship only when supplied. Offer concise acknowledgment plus a realistic next action or clarification; never invent a commitment.",
 romance:"Separate explicit interest, reciprocal effort and scheduling behavior from ambiguous politeness or lack of context. Prefer reversible low-pressure choices; respect refusals.",
 mediator:"Identify the actual point of disagreement, distinguish impact from unverified intent, and offer a specific repair agreement or respectful pause; do not demand reconciliation."
});
