// Shared app constants (safe to import from anywhere).

// Maximum active mentees a single mentor may hold at once.
export const MAX_MENTEES = 3;

// Generous message rate limit: messages one person may send in a conversation
// per minute. High enough not to punish normal rapid texting; low enough to
// stop spam or a blitz.
export const MESSAGES_PER_MINUTE = 20;
