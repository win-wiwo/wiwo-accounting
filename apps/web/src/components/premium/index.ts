/**
 * Premium UI primitives — the visual system used by the reference pages
 * (Dashboard, Purchase Requests, Procurement Queue) and adopted across the
 * rest of the app for visual consistency.
 *
 * Tokens are copied verbatim from the reference pages so adoption is purely
 * a structural refactor with zero visual change to the references.
 */
export { PageHeader, MetricPill } from './page-header';
export type { MetricPillTone } from './page-header';

export { PrimaryButton, GhostButton } from './primary-button';

export { Surface } from './surface';

export {
  FilterBar,
  SearchInput,
  FilterControls,
  premiumSelectTriggerClass,
} from './filter-bar';

export {
  StatusBadge,
  prStatusTone,
  prPriorityTone,
} from './status-badge';
export type { BadgeTone } from './status-badge';

export { Pagination } from './pagination';

export { EmptyState } from './empty-state';
export type { IconTone } from './empty-state';

export { ListSkeleton } from './list-skeleton';

export { FormField, premiumTextareaClass } from './form-field';
