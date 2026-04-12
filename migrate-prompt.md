Convert this vanilla JavaScript application into a modern React application using Vite and TypeScript.

Step 1: Generate a detailed migration plan and export it as a .md (Markdown) file.
The plan should include:

Overview of current architecture
Proposed React + Vite + TypeScript architecture
Folder and project structure
Component breakdown (mapping current UI/logic to React components)
State management approach (local state, context, etc.)
Mapping from existing files/functions to the new structure
Strategy to preserve 100% business logic and behavior
Identification of duplicate logic and plan to refactor into reusable utility functions or custom hooks
Testing strategy:
Recommended testing framework (e.g., Vitest, React Testing Library)
Folder structure for tests
Approach for unit testing components, hooks, and utilities
Plan for gradually adding test coverage without breaking existing functionality
Migration steps (step-by-step)

Do not generate implementation code yet. Wait for approval before proceeding.

Step 2 (after approval): Implement the migration.

Implementation requirements:

Preserve 100% of the existing business logic and behavior. Do not change any functionality.
Use functional components with React Hooks.
Split the code into small, reusable, and well-structured components.
Refactor duplicate logic into reusable utility functions or custom hooks.
Apply strict TypeScript typing for components, props, state, and utilities.
Extract sensitive configuration (e.g., API keys, tokens) into .env variables, following the current approach.
Organize the project with a clear, scalable folder structure.
Set up a testing framework (e.g., Vitest + React Testing Library) ready for unit tests.
Keep the UI and user flows identical unless minor structural changes are required for React.

The goal is to improve readability, maintainability, testability, and scalability without altering existing behavior.
