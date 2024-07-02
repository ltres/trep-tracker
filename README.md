# trep-tracker 
![trep-tracker icon](https://github.com/ltres/trep-tracker/blob/2b75c545cfd54d2a2c7a49a9df2060537a59db21/src/assets/icon/ios/AppIcon-40%402x~ipad.png)

`trep-tracker` is a **minimal and minimalistic project manager-oriented task tracker/todo list**, designed to allow tracking TODOs efficiently and focusing on task prioritization and speed of use.

`trep-tracker` is especially useful for project managers who need to keep track of various tags related to different projects and team members. 
It allows you to have a clear view of tasks associated with specific projects or colleagues, allowing for quick and efficient monitoring.

<img src="https://github.com/ltres/trep-tracker/blob/9fcfeff31dc956c81b2eccc406e1aae2531af5a4/src/assets/readme/screen.jpg" width="750" />

### Who should use `trep-tracker`
- People that have a medium to high number of tasks to do on a daily basis, and need to note them down quickly and efficiently. 
- People who manage small teams and needs to track activities for colleagues. 
- People who like a straight to the point, minimal approach to TODOs. 

### Who should NOT use `trep-tracker`
- People who are looking for a fully fledged, state-of-art, all-in-one TODO tracking solution with all the bells and whistles. 
- ☐ TODO find additional points for this list. 

## Features
- **Boards**: A workspace area. You can have multiple boards.
- **Lanes**: Each board contains lanes that function as tracks where tasks are inserted.
- **Tasks**: Each task is a line of text with a status and priority. Tasks can be moved, dragged, edited, marked as done, and archived. Tasks can have a father-child relation.
- **Tagging**: Advanced tagging system where you can use special characters like @ or # to add tags within tasks/lanes text, which are appropriately highlighted.
- **Static Lanes (views)**: Lanes that have one or more tags in the title. These lanes automatically show all tasks with the specified tag(s), sorted by descending priority. Views can also be filtered by task priority
- **Search**: Search functionality to quickly find tasks.
- **Archive**: Move archived tasks in a dedicated lane.
- **Simple, sleek interface**: Dark mode, minimal GUI.

## How to Run `trep-tracker`
Either download and run the latest executable from the release page, or check out this git repository and start your dev server with `npm run electron`.

### How to Use
1. **Open a status file or create a new one**: The initial wizard will guide you. You can save different statuses. It is advisable to store the status in a cloud-synced location of your drive.
3. **Add Lanes**: Within the first board, add lanes by clicking on the `Add lane` button on the top right. You can rename the lane and move it around.
4. **Insert Tasks**: Add tasks into the lanes, assigning priorities and tags. Create new tasks by simply pressing `Enter`.
5. **Manage Tasks**: Edit, complete, drag, indent or archive tasks as needed.
6. **Use Tags**: Use `@tags` and `#tags` in your task content to associate that task or lanes to tags,
7. **Create Static Lanes**: Add tags to lane titles to create dynamic views of tasks holding that/those tag(s).
8. **Start working on the tasks**: And update their status accordingly.

## How is `trep-tracker` made
`trep-tracker` is built with Angular 17 and packaged with Electron 31.
