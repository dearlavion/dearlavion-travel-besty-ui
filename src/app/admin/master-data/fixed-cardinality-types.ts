// Collections whose row count is fixed — the backend rejects add/delete for them, so the admin UI
// must not offer either (renaming is still fine). Duration is the only one today: its rows are
// scoring keys the kit-sizing engine reads directly via `code`. Kit Settings enforces the same rule
// through its per-section `allowAddDelete` flag.
export const FIXED_CARDINALITY_TYPES = new Set<string>(['duration']);
