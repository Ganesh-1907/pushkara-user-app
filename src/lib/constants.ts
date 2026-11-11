/** Form option lists (UI definitions, not business data). The backend stores these values as free text. */
export const CHECKLIST = ['Toilets clean', 'Drinking water available', 'Lighting working', 'Barricades intact', 'Signage visible', 'Garbage cleared', 'Changing rooms usable', 'Steps / ghat surface safe']
export const TICKET_CATEGORIES = ['Sanitation', 'Water supply', 'Electrical', 'Structural damage', 'Crowd / safety', 'Signage', 'Other']
export const CONDITIONS = ['Good', 'Fair', 'Poor', 'Damaged'] as const
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const
export const isOfficerRole = (r?: string) => r === 'officer' || r === 'admin'
