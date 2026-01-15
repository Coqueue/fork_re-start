# Code Structure

This document outlines the structure of the `re-start` codebase.

## Directory Layout

- **`src/`**: Contains the source code.
  - **`App.svelte`**: The main application component.
  - **`lib/`**: Library code.
    - **`components/`**: UI components and widgets.
      - `Tasks.svelte`: The tasks widget.
      - `Weather.svelte`: The weather widget.
      - `Clock.svelte`: The clock widget.
      - `Settings.svelte`: The settings modal.
      - ... and others.
    - **`backends/`**: Backend logic for fetching data (e.g., Todoist, Google Tasks, Local Storage).
    - **`stores/`**: Svelte stores for state management (e.g., `settings-store.svelte.js`).
    - **`config/`**: Configuration files (e.g., themes).
    - **`utils/`**: Utility functions.
- **`public/`**: Static assets.
- **`scripts/`**: Build scripts.

## Key Concepts

- **Widgets**: The dashboard is composed of widgets (`Tasks`, `Weather`, `Clock`, etc.) that can be toggled in the settings.
- **Settings**: Settings are persisted in `localStorage` and managed via a Svelte store (`settings-store.svelte.js`).
- **Backends**: The `Tasks` widget supports multiple backends using a factory pattern (`createTaskBackend`).
