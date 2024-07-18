import { generateUUID } from "../utils/utils";

export interface Board extends Container<Lane> {
    layout: Layout
    _type: 'board',
}

export const Layouts = {
    absolute: {
        columns: 1,
        symbol: "Free"
    },
    flex1: {
        columns: 1,
        symbol: "☐"
    },
    flex2: {
        columns: 2,
        symbol: "☐☐"
    },
    flex3: {
        columns: 3,
        symbol: "☐☐☐"
    },
    flex4: {
        columns: 4,
        symbol: "☐☐☐☐"
    },
}

export type Layout = keyof typeof Layouts;

type LayoutProperties = {
    [K in Layout]: {
        column: number;
        order: number;
        width: number;
    }
};

export interface Lane extends Container<Task> {
    _type: 'lane',
    showChildren: boolean,
    index: number,
    isArchive: boolean,
    priority: Priority[] | undefined,
    status: Status[] | undefined,
    layouts: LayoutProperties
}

export interface Task extends Container<Task> {
    _type: 'task',
    createdLaneId: string,
    priority: Priority,
    status: Status,
}

export interface Container<T extends Container<any> = any> {
    id: string;
    _type: string,
    textContent: string;
    children: T[];
    tags: Tag[];
    creationDate: ISODateString,
    priority: Priority | Priority[] | undefined,
    status: Status | Status[] | undefined,
    dates: StateChangeDate
    coordinates?: {
        x: number,
        y: number
    },
}


export interface Tag {
    tag: string;
    type: string
}
export type Priority = 1 | 2 | 3 | 4;
export const Priorities: Priority[] = [1, 2, 3, 4];

export const Statuses = {
    todo: {
        icon: "☐"
    },
    "in-progress": {
        icon: "🛠️",
    },
    "to-be-delegated": {
        icon: "🙇",
    },
    delegated: {
        icon: "👦🏼",
    },
    waiting: {
        icon: "⏳",
    },
    completed: {
        icon: "✅",
    },
    discarded: {
        icon: "🗑️",
    },
    archived: {
        icon: "📂",
    }
}

export type Status = keyof typeof Statuses;

export type StateChangeDate = {
    [keyStatus in Status]?: {
        enter?: ISODateString,
        leave?: ISODateString
    };
};

export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`

export const addTagsForDoneAndArchived = false

export const tagIdentifiers: { type: string, symbol: string, class: string }[] = [
    {
        type: "tag-orange",
        symbol: '@',
        class: "tag-orange"
    },
    {
        type: "tag-yellow",
        symbol: '#',
        class: "tag-yellow"
    },
    {
        type: "tag-green",
        symbol: '!',
        class: "tag-green"
    }
]
export const tagHtmlWrapper = (kl: string) => (['<span tag="true" class="' + kl + '">', '<\/span>'])
export const tagCapturingGroup = (symbol: string) => (`${symbol}([A-Za-z0-9\-\_]+)`);


export const getNewTask: (lane: Lane, textContent?: string | undefined) => Task = (lane: Lane, textContent?: string | undefined) => {
    let uuid = generateUUID();
    return {
        id: uuid,
        createdLaneId: lane.id,
        textContent: textContent ?? `Task ${uuid}`,
        children: [],
        tags: [],
        dates: {

        },
        _type: "task",
        creationDate: new Date().toISOString() as ISODateString,
        stateChangeDate: undefined,
        archived: false,
        archivedDate: undefined,
        priority: 1,
        status: "todo"
    }
}

export const archivedLaneId = "Archive";

export const getNewLane: (archive: boolean) => Lane = (archive: boolean) => {
    let id = generateUUID();
    return {
        id: id,
        tags: [],
        columnNumber: 1,
        index: 0,
        showChildren: true,
        textContent: archive ? "Archive" : "Lane " + id,
        children: [],
        status: undefined,
        _type: "lane",
        dates: {},
        isArchive: archive,
        creationDate: new Date().toISOString() as ISODateString,
        stateChangeDate: undefined,
        priority: undefined,
        width: undefined,
        archived: false,
        archivedDate: undefined,
        layouts: getLayouts()
    }
}

export function getLayouts(width?: number | undefined): LayoutProperties {
    return {
        absolute: {
            column: 1,
            order: 1,
            width: width ?? 100
        },
        flex1: {
            column: 1,
            order: 1,
            width: width ?? 1
        },
        flex2: {
            column: 1,
            order: 1,
            width: width ?? 1
        },
        flex3: {
            column: 1,
            order: 1,
            width: width ?? 1
        },
        flex4: {
            column: 1,
            order: 1,
            width: width ?? 1
        }
    }
}

export const getNewBoard: (firstLane: Lane) => Board = (firstLane: Lane) => (
    {
        id: generateUUID(),
        layout: 'absolute',
        flexColumns: undefined,
        _type: "board",
        textContent: "Board",
        tags: [],
        status: undefined,
        priority: undefined,
        dates: {},
        children: [firstLane],
        creationDate: new Date().toISOString() as ISODateString,
        stateChangeDate: undefined,
        archived: false,
        archivedDate: undefined
    }
)