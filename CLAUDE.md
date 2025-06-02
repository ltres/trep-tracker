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

## Time Management & Gantt System

### Task Time Types

The system supports sophisticated time management with two fundamental task types:

#### Fixed Tasks (`FixedTimedTask`)
- **Definition**: Tasks with explicit start and end dates
- **Structure**: `{ startDate: ISODateString, endDate: ISODateString, type: "fixed" }`
- **Behavior**: 
  - User sets specific start/end dates
  - Duration automatically calculated from date range
  - When moved in Gantt: preserves duration, updates dates
  - When resized in Gantt: updates duration and end date
- **Use Cases**: Meetings, deadlines, time-bound activities

#### Rolling Tasks (`RollingTimedTask`)
- **Definition**: Tasks with duration but no fixed dates - scheduled dynamically based on dependencies
- **Structure**: `{ durationInWorkingHours: number, type: "rolling", predecessors: NonEmptyArray<{taskId, linkId}> }`
- **Behavior**:
  - No explicit start/end dates stored
  - Computed dates based on predecessor completion + duration
  - Must have at least one predecessor to exist
  - When moved in Gantt: no effect (auto-calculated)
  - When resized in Gantt: updates duration only
- **Use Cases**: Dependent work, sequential tasks, project phases

### Task Conversion System

**Fixed → Rolling**: Automatic when creating predecessor links
```typescript
// Creating a link converts target task to rolling
target.time.predecessors.push({taskId: source.id, linkId: data.id});
this.boardService.convertTaskToRolling(target);
```

**Rolling → Fixed**: Automatic when removing all predecessors
```typescript
// When last predecessor removed, converts back to fixed with computed dates
const dates = this.boardService.getComputedTaskDates(task, workingHours);
task.time = {
  startDate: toIsoString(dates.startDate),
  endDate: toIsoString(dates.endDate),
  type: 'fixed',
  predecessors: []
};
```

### Gantt Component Architecture (`src/app/gantt/gantt.component.ts`)

#### Core Functionality
- **Library**: dhtmlx-gantt with extensive customization
- **Views**: Supports months, days, and hours scales
- **Features**: Task links, progress tracking, milestone support, drag-scrolling

#### Task Processing Pipeline
1. **Data Conversion**: `toDhtmlxGanttDataModel()` converts internal task structure to dhtmlx format
2. **Time Initialization**: `initTimeData()` sets default dates for tasks without time data
3. **Date Computation**: `getComputedTaskDates()` calculates rolling task dates from predecessors
4. **Cascading Updates**: Changes propagate through dependency chains

#### Project Handling
- **Parent Tasks**: Projects display as summary bars spanning child date ranges
- **Hierarchy**: Supports unlimited nesting with parent-child relationships
- **Dependency Inheritance**: Creating links to projects affects all descendants

### Date & Duration Calculations

#### Working Time System
- **Working Hours**: Configurable business hours (default 8:00-17:00)
- **Weekend Handling**: Excludes Saturday/Sunday from calculations
- **Snap-to-Work-Days**: `snapToWorkDays()` ensures dates fall on working time
- **Duration Units**: Hours-based with automatic day/week conversions

#### Milestone Support
- **Definition**: Tasks with zero duration (start_date === end_date)
- **Display**: Special diamond shape in Gantt view
- **Behavior**: Moveable but not resizable

### Link Validation & Management

#### Validation Rules (`boardService.validateGanttLink()`)
- Prevents circular dependencies
- Blocks parent→child and child→parent links
- Validates cross-project dependencies
- Ensures logical predecessor relationships

#### Link Types
- **Finish-to-Start**: Default dependency type (predecessor must complete before successor starts)
- **External References**: Tasks from other lanes can be linked
- **Cascading Updates**: Link changes propagate through entire dependency chain

### Gantt UI Features

#### Interaction Modes
- **Task Movement**: Drag tasks to change dates (fixed) or no effect (rolling)
- **Task Resizing**: Drag edges to modify duration
- **Link Creation**: Drag from task connection points to create dependencies
- **Drag Scrolling**: Empty space dragging for timeline navigation

#### Visual Elements
- **Today Marker**: Red line indicating current date
- **Progress Bars**: Visual progress tracking within tasks
- **CSS Classes**: `gantt-parent-task`, `gantt-milestone`, `gantt-weekend`
- **Resource Coloring**: Task colors based on assigned resources

#### Error Handling
- **Deletion Prevention**: Tasks cannot be deleted from Gantt view
- **Invalid Link Alerts**: User feedback for forbidden dependency creation
- **Graceful Fallbacks**: Handles undated tasks and empty lanes

### Integration with Board System

#### Change Propagation
- **Publisher Service**: Gantt changes trigger board-wide updates
- **Debounced Updates**: Prevents excessive recalculations during rapid changes
- **Lane Synchronization**: Gantt reflects current lane's task hierarchy

#### Data Persistence
- **Time Data Storage**: Embedded in task objects as `TimeData` interface
- **Link Persistence**: Stored as predecessor arrays in target tasks
- **State Consistency**: BoardService ensures data integrity across views

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