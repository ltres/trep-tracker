import { Injectable } from '@angular/core';
import { AiServiceI } from '../types/ai';
import OpenAI from "openai";
import { Board } from '../types/task';
import { removeEntry } from '../utils/utils';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable({
  providedIn: 'root'
})
export class ChatGPTService implements AiServiceI {
  apiKey: string | null = this.getApiKey();

  openai: OpenAI | undefined;
  constructor() { }

  systemPropmt = `
  You are an assistant inside a task tracker/TODO app named 'trep-tracker'.
  Your only job is to help the user manage tasks, have insight on them and prioritize them properly.
  The first user prompt will be a JSON string representing the user's TODO list. 
  Here you will find a board, in which you will find some lanes, with a name, and in each lane you will find some tasks. 
  Tasks have a status and a priority (1 being the lowest, 4 being the highest) and various self-explicatives attributes like status, state change dates, etc. 
  You can consider the order of the task as "visibility", so that if a task is on top of the list, it is more visible to the user.
  If a task has been moved up or down, the user is giving it more or less visibility.

  Please help the user to manage his tasks, by providing insights.
  Respond with a very straight to the point message, with lenght 100-200 words maximum (VERY IMPORTANT).
  Be very precise and concise, and always provide a clear and actionable insight.
  Consider also the dates in which the various tasks entered their status, to give suggestions.
  Speak as if the app is speaking to the user.
  Avoid unnecessary verbosity, and always provide a clear and actionable insight.
  Do not add any useless boilerplate phrase, only punctual considerations.

  User could be providing also a "latest board sent" message, which you should use to compare the current board with the latest one sent and provide additional insights.
  In this case, very clearly analyze the tasks that have changed priority and/or status, and provide insights on them 
  (VERY IMPORTANT TO TRACK PRIORITY/STATUS/VISIBILITY CHANGES AND NEW TASKS).
  Base on the task ID field to identify variations in priority, status, textContent, dates.

  Do not cite task IDs in the answer.
  `
  getApiKey(): string | null {
    this.apiKey = localStorage.getItem("openAIAPIKey");
    return this.apiKey;
  }
  setApiKey(key: string): void {
    this.apiKey = key;
    if (!key) {
      localStorage.removeItem("openAIAPIKey");
    }else{
      localStorage.setItem("openAIAPIKey", key);
    }
  }

  getLatestSentBoard(boardId: string): string | null {
    return localStorage.getItem("latestSentBoard" + boardId);
  }
  storeAsLatestSent(boardId: string, val: string) {
    localStorage.setItem("latestSentBoard" + boardId, new Date().toISOString() + ':' + val);
  }

  getInsight(board: Board): Promise<string> {
    if (!this.apiKey) {
      throw new Error("No API key set");
    }
    if(!this.openai){
      this.openai = new OpenAI({ apiKey: this.apiKey, dangerouslyAllowBrowser: true })
    }
    // Clean up and minimize the board json:
    let object = JSON.parse(JSON.stringify(board));
    removeEntry(object, "coordinates");
    removeEntry(object, "width");
    removeEntry(object, "createdLaneId");
    removeEntry(object, "showChildren");

    // archive and static lanes

    removeEntry(object, undefined, (k: string, v: any) => {
      if (typeof v === "string" && v === "") {
        return true;
      } else if (Array.isArray(v) && v.length === 0) {
        return true
      } else if (typeof v === "object" && Object.keys(v).length === 0) {
        return true;
      } else if (typeof v === "object" && !Array.isArray(v) && !v.textContent) {
        return true
      } else if (typeof v === "object" && !Array.isArray(v) && v["_type"] === "lane" && (!v.children || v.children.length === 0)) {
        return true
      } else if (typeof v === "object" && v["isArchive"] === true) {
        return true;
      }
      return false;
    });

    let str = JSON.stringify(object);
    str = str.replaceAll(/(<[^>]+>([^>]*))(<[^>]+>)/g, "<tag>$2</tag>")

    let latest = this.getLatestSentBoard(board.id);
    if (latest != null) {
      let p = `Latest board sent: <${latest}> \n\n, current board: ${new Date().toISOString()}<${str}> \n\n`
      this.storeAsLatestSent(board.id,str);
      return this.fetchOpenAIResponse(
        `Current board: ${new Date().toISOString()}<${str}>`,
        `Latest board sent (consider this to retrieve any difference with the current board): <${latest}>`);
    } else {
      this.storeAsLatestSent(board.id,str);
      return this.fetchOpenAIResponse(str);
    }

  }

  private async fetchOpenAIResponse(userPrompt: string, oldPrompt?: string): Promise<string> {

    let messages: ChatCompletionMessageParam[] = [{
      role: "system",
      content: this.systemPropmt
    }];
    if (oldPrompt) {
      messages.push({
        role: "user",
        content: oldPrompt
      });
    }
    messages.push(
      {
        role: "user",
        content: userPrompt
      })


    // return "ol";
    const completion = await this.openai!.chat.completions.create({
      messages,
      max_tokens: 500,
      temperature: 0.5,
      model: "gpt-4o",
    });

    console.log(completion.choices[0]);
    return completion.choices[0].message.content ?? "No response";
  }



}
