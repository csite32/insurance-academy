# Project architecture rules

- Use `CourseActionButton` for learner-facing links that enter or resume a course, so their interaction and styling stay consistent.
- Assign course icons through the centralized `iconKey` registry and choose an unused key for each new course, so course cards remain visually distinct.