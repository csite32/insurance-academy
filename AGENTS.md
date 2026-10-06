# Project architecture rules

- Use `CourseActionButton` for learner-facing links that enter or resume a course, so their interaction and styling stay consistent.
- Assign course icons through the centralized `iconKey` registry and choose an unused key for each new course, so course cards remain visually distinct.- Content access is the union of direct course assignments, direct lesson assignments, and bundle memberships; enforce it server-side via `user_has_course`/`user_has_lesson` and keep each source saved independently, so removing one source never revokes access granted by another.
