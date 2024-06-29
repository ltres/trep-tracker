# trep-tracker 
![trep-tracker icon](src\assets\icon\ios\AppIcon-40@2x~ipad.png)

`trep-tracker` is a **project manager-oriented task tracker/todo list**, designed to manage activities efficiently and focusing on task prioritization and quickness of use.

`trep-tracker` is especially useful for project managers who need to keep track of various tags related to different projects and team members. 
It allows you to have a clear view of tasks associated with specific projects or colleagues, allowing for quick and efficient monitoring.

### Features
- **Boards**: A workspace area. You can have multiple boards, but only one can be selected at a time.
- **Lane**: Each board contains lanes that function as tracks where tasks are inserted.
- **Task**: Each task is a line of text with a status and priority. Tasks can be edited, marked as done, and archived.
- **Tagging**: Advanced tagging system where you can use special characters like @ or # to add tags within tasks, which are appropriately highlighted. Also, words that represent tasks are automatically extracted from the text you write
- **Static Lanes (views)**: Lanes that have one or more tags in the title. These lanes automatically show all tasks with the specified tag, sorted by descending priority. Views can also be filtered by task priority
- **Search**: Search functionality to quickly find tasks.
- **Archive**: Move archived tasks in a dedicated lane.
- **Simple, sleek interface**: Dark mode, minimal GUI.

## How to Run `trep-tracker`
Either check out this git repository and start your dev server with `npm run electron`, or download and run the latest executable from the release page.

## How to Use

1. **Configure status URL**: The first step when launching the application is to configure the URL where the application saves its state. Fill the URL in the `Status storage location` input.
3. **Add Lanes**: Within the board, add lanes by clicking on the `Add lane` button on the top right. You can rename the lane and move it around.
4. **Insert Tasks**: Add tasks into the lanes, assigning priorities and tags. Create new tasks by simply pressing `Enter`.
5. **Manage Tasks**: Edit, complete, or archive tasks as needed.
6. **Use Tags**: Use `@tags` and `#tags` in your task content to associate that task to tags,
7. **Create Static Lanes**: Add tags to lane titles to create dynamic views of tasks holding that/those tag(s).
8. **Start working on the tasks**: And update their status accordingly.

## How is `trep-tracker` made
`trep-tracker` is built with Angular 17 and packaged with Electron 31.

