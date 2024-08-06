# trep-tracker 📝
![trep-tracker icon](https://github.com/ltres/trep-tracker/blob/2b75c545cfd54d2a2c7a49a9df2060537a59db21/src/assets/icon/ios/AppIcon-40%402x~ipad.png)

`trep-tracker` is a **to-the-point and minimalistic project manager-oriented task tracker/todo list**, designed to allow tracking TODOs efficiently and focusing on task prioritization and speed of use.

`trep-tracker` is especially useful for project managers who need to keep track of various tags related to different projects and team members. 
It allows you to have a clear view of tasks associated with specific projects or colleagues, allowing for quick and efficient progress monitoring.

But it works really well also for simpler scenarios, like personal todo lists.

If you have ever used notepad for task tracking, have tried many todo-list apps and got back to notepad because you needed a more efficient tool (like myself), `trep-tracker` may be the app for you.

## 💻 Try it live: <a href="https://ltres.github.io/trep-tracker/browser/" target="_blank">https://ltres.github.io/trep-tracker/browser/</a> 💻
The above is a browser-based version, intended to showcase the functionalities that `trep-tracker` offers. 
If you like what you see, consider downloading the <a href="https://github.com/ltres/trep-tracker/releases">distributed package</a> to run it natively on your system, for an overall better experience.

### 👁️ See it in action
<img src="https://github.com/ltres/trep-tracker/blob/5b2da12eaede7f92c450430c569b2dc39f6553ec/src/assets/readme/trep-tracker-31-07-2024.gif" width="850" />

## ▶️ How to Run `trep-tracker`
Either download and run the latest executable from the <a href="https://github.com/ltres/trep-tracker/releases">release page</a> or check out this git repository and start your dev server with `npm run electron`.

## ✅ Who should use `trep-tracker`
- People that have a medium to high number of tasks to do on a daily basis, and need to note them down quickly and efficiently. 
- People who manage small teams and needs to track activities for colleagues.
- People who want their TODO app to help them organize and prioritize quickly-noted tasks with views.
- People who like a straight to the point, minimal approach to TODOs. 

## ✨ Features & concepts
### **Boards**
A workspace area. You can have multiple, independent boards.
### **Lanes**
Each board contains lanes, draggable 'post-its' which can hold tasks.
### **Tasks**
Each task is a line of text with a status and priority. 
They can have a father-child relation. 
They can be selected and ordered quickly using just the keyboard; can be moved, dragged, edited, their status can be changed:
  - ⬜ todo
  - 🛠️ in progress
  - 🙇 to delegate
  - 👦🏼 delegated
  - ⏳ waiting
  - ✅ done
  - 📂 archived (gets moved into a dedicated lane)
  - 🗑️ discarded
### **Tags**
Tags can be tagged using specific symbols @, #, !. Each `@tag` is colored differently in order to be distinguishable at a glance.
### **Static Lanes (views)**
You can also `@tag` lanes. When you do, the lane becomes *static* and automatically displays tasks with the included tag(s). Static lanes can also display tasks filtering on priority, status, or a combination of both.
### **Search**
Quickly find tasks by pressing Ctrl + F.
### **Gantt**
Show selected tasks in dynamic gantts!

## 🧾 Where is my data stored?
`trep-tracker` stores your tasks data in a local '.trptrk' (json) file.

## 👨‍💻 How is `trep-tracker` made
`trep-tracker` is built with Angular 18 and packaged with Electron 31.
