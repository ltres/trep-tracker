# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**trep-tracker** is a PM-oriented task tracker built with Angular 18 and Electron 31. It's a minimalistic, high-performance tool for managing hundreds of tasks simultaneously with support for both web and desktop environments.

## Essential Commands

### Development
- `npm run dev` - Start Angular development server
- `npm run electron` - Run Electron app with hot reload
- `npm start` - Electron forge start (production-like)

### Build & Deploy
- `npm run build` - Production build for Electron
- `npm run build-github-pages` - Build for GitHub Pages deployment
- `npm run make` - Create distributable packages
- `npm run package` - Package without creating installers

### Testing & Quality
- `npm test` - Run Playwright E2E tests
- `npm run test-gui` - Run Playwright tests with UI
- `npm run lint-pretty` - ESLint + Prettier formatting

## Architecture Overview

### Core Data Model
- **Boards**: Workspace containers with configurable layouts (absolute, flex1-4)
- **Lanes**: Draggable containers within boards that hold tasks
- **Tasks**: Text-based items with status, priority, tags, dates, and hierarchical relationships
- **Projects**: Tasks with children that auto-compute status from child tasks

### Key Services

**BoardService** (`src/service/board.service.ts`): Central state management using RxJS BehaviorSubjects. Manages all entities and their relationships with debounced updates (micro: 200ms, small: 750ms, huge: 2000ms).

**Storage Pattern**: Polymorphic storage with `LocalFileStorageService` for web and `ElectronService` for desktop, injected based on environment.

**DragService**: Registry-based drag & drop system supporting complex interactions between tasks, lanes, and boards.

**ChangePublisherService**: Centralized change detection with debouncing to coordinate state changes across components.

### Component Architecture

Uses `ContainerComponent` base class with smart directives:
- `DraggableDirective`: Complex drag behavior with layout awareness
- `DroppableDirective`: Drop target management with registry lookup
- `ContenteditableDirective`: Inline task editing
- `TooltipDirective`: Rich tooltips

### Advanced Features

**Task System**: Status (todo, in-progress, completed, etc.), priority (1-5), tags (`@mentions`, `#hashtags`, `!important`), and hierarchical relationships.

**Static Lanes**: Dynamic views that filter tasks by tags, priority, status, or timeframes (6h, 24h, week, month).

**Gantt Integration**: Uses dhtmlx-gantt for project planning with date dependencies.

**Similarity Detection**: Automatic detection and linking of similar tasks using string matching algorithms.

## Development Patterns

### Code Style
- Strict TypeScript with all compiler options enabled
- Custom ESLint rules enforce `if(){}`, `function()` spacing patterns
- 2-space indentation, no spaces before blocks
- Performance decorators for timing critical operations

### Performance
- Strategic use of `OnPush` change detection
- Debounced operations for expensive computations
- Performance logging and timing decorators
- Optimized for handling hundreds of tasks simultaneously

### Git Workflow
- Automated versioning via git hooks using commit message patterns: `[major+]`, `[minor+]`, `[patch+]`
- Feature branches get `-preview` suffix, main branch gets `-beta`
- Main branch: `master`

### Testing Strategy
- E2E-first approach with comprehensive Playwright tests
- Tests cover drag/drop, task management, Gantt charts, and board operations
- Real user scenario simulation

## Environment Configuration

Multiple build targets:
- `development` - Standard Angular dev
- `electrified-dev/prod` - Electron builds with file system storage
- `github-pages` - Web deployment build

Storage services are environment-injected: `LocalFileStorageService` for web, `ElectronService` for desktop.

## Electron Integration

Multi-process architecture with main + renderer processes. Native file operations for `.trptrk` files, context menus via electron-context-menu, and production security via Electron fuses.

Uses Electron Forge for cross-platform packaging (Windows, macOS, Linux) with GitHub releases publisher configuration.