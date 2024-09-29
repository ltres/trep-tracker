# <img src="https://github.com/ltres/trep-tracker/blob/2b75c545cfd54d2a2c7a49a9df2060537a59db21/src/assets/icon/web/icon-192.png" width="40" /> trep-tracker 
<p align="center">
  <img src="https://github.com/ltres/trep-tracker/blob/0753d812dac9c675f98098c9d86fccd4faa83621/src/assets/readme/social-preview-06-08-2024.png" width="700" />
</p>

`trep-tracker` is a **to-the-point and minimalistic task tracker/todo list**, designed to allow tracking TODOs efficiently and focused on simplicity and speed of use.

`trep-tracker` is designed to be **fast**, stay **out of the way**, and allow management of **hundreds of tasks** at the same time, helping you streamlining and prioritizing your work.

`trep-tracker` is a tool created for people that need to keep track of **work streams, different topics, projects, team members, deadlines, plans**.

But it works really well also for **simpler scenarios**, like **personal TODO lists** 📝.

_➡️ If you have ever used notepad for task tracking, have tried many todo-list apps and got back to notepad because you needed a more efficient tool, `trep-tracker` may be the app for you. I was there._

### 💻 Try it live: <a href="https://ltres.github.io/trep-tracker/browser/" target="_blank">https://ltres.github.io/trep-tracker/browser/</a> 💻
> _The above is a browser-based version, intended to showcase the functionalities that `trep-tracker` offers. 
> If you like what you see, consider downloading the <a href="https://github.com/ltres/trep-tracker/releases">distributed package</a> to run it natively on your system, for an overall better experience._

## 👁️ See it in action
<img src="https://github.com/ltres/trep-tracker/blob/d69916a38fe6c8375832f10dfb39ae4fe3cf5dca/src/assets/readme/trep-tracker-07-09-2024.gif" width="1000" />

## ▶️ How to Run `trep-tracker`
Either download and run the latest executable from the <a href="https://github.com/ltres/trep-tracker/releases">release page</a> or check out this git repository and start your dev server with `npm run electron`.

## ✅ Who should use `trep-tracker`
- People that have a **medium to high number of tasks** to track on a daily basis, and need to **note them down quickly** and sort them fast. 
- People who manage **small teams** and needs to track multiple activities and streams.
- People who look for an **effective** tool with **quick-sorting, tagging, prioritization** and easy **views generation**
- People who like a **straight to the point**, minimal approach to TODOs. 

## ✨ Features & concepts
### **Boards**
A **workspace area**. You can have multiple, independent boards.
### **Lanes**
Each board contains lanes, **draggable areas** which can hold tasks.
### **Tasks**
Each task is a **line of text** with a **status** and **priority**. Quicly enter a new one as you would do in a text file, by clicking **Enter**.

They can be **selected** and **ordered** quickly using just the keyboard; can be **moved, edited, programmed, prioritized**.

Each task has a status:
> **⬜ todo, 🛠️ in progress, 🙇 to delegate, 👦🏼 delegated, ⏳ waiting, ✅ done, 📂 archived, 🗑️ discarded**

Tasks can have a **father-child** relation. When a task has children, it becomes a **Project** (a container for other tasks)

Tasks can also be **planned** and viewed in a **gantt diagram**.

### **Tags**
Tags can be **tagged** as you write, using specific symbols `@`, `#`, `!`. Each `@tag` is colored differently in order to be easily distinguishable.
### **Static Lanes (views)**
You can also `@tag` lanes. When you do, the lane becomes *static* and automatically displays tasks with the included tag(s). 

Static lanes can also display tasks filtering on **priority, status, task start/end dates** or a combination of these filters.
### **Gantt**
Show selected tasks in **dynamic gantt diagrams**, for a whole board or for single lanes.

## 🧾 Where is my data stored?
`trep-tracker` stores your tasks data in a local '.trptrk' (json) file.

## 👨‍💻 How is `trep-tracker` made
`trep-tracker` is built with Angular 18 and packaged with Electron 31.
