import { Injectable } from '@angular/core';
import { AiServiceI } from '../types/ai';
import Anthropic from "@anthropic-ai/sdk";
import { Board } from '../types/task';

@Injectable({
  providedIn: 'root'
})
export class ClaudeService implements AiServiceI{
  private apiKey = '';
  private anthropic = new Anthropic({ apiKey: this.apiKey });

  constructor() { }
  getApiKey(): string | null {
    throw new Error('Method not implemented.');
  }
  setApiKey(key: string): void {
    throw new Error('Method not implemented.');
  }
  getInsight(board: Board): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async callClaudeAPI(prompt: string): Promise<string> {
    const msg = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0,
      system: "Respond only with short poems.",
      messages: [
          {
          "role": "user",
          "content": [
              {
              "type": "text",
              "text": prompt
              }
          ]
          }
      ]
      });
      console.log(msg);
      return JSON.stringify(msg);
  }


}
