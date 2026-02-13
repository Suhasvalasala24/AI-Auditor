import { type User, type InsertUser, type CustomModel, type InsertCustomModel, type Audit, type InsertAudit } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getModels(): Promise<CustomModel[]>;
  getModel(id: string): Promise<CustomModel | undefined>;
  createModel(model: InsertCustomModel): Promise<CustomModel>;
  updateModel(id: string, model: Partial<InsertCustomModel>): Promise<CustomModel | undefined>;
  deleteModel(id: string): Promise<boolean>;
  
  getAudits(): Promise<Audit[]>;
  getAudit(id: string): Promise<Audit | undefined>;
  createAudit(audit: InsertAudit): Promise<Audit>;
  updateAudit(id: string, audit: Partial<InsertAudit>): Promise<Audit | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private models: Map<string, CustomModel>;
  private audits: Map<string, Audit>;

  constructor() {
    this.users = new Map();
    this.models = new Map();
    this.audits = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getModels(): Promise<CustomModel[]> {
    return Array.from(this.models.values());
  }

  async getModel(id: string): Promise<CustomModel | undefined> {
    return this.models.get(id);
  }

  async createModel(insertModel: InsertCustomModel): Promise<CustomModel> {
    const id = randomUUID();
    const model: CustomModel = { 
      ...insertModel, 
      id,
      apiKey: insertModel.apiKey || null,
      provider: insertModel.provider || null,
      description: insertModel.description || null,
      temperature: insertModel.temperature || null,
      maxTokens: insertModel.maxTokens || null,
      topP: insertModel.topP || null,
      seed: insertModel.seed || null,
    };
    this.models.set(id, model);
    return model;
  }

  async updateModel(id: string, updates: Partial<InsertCustomModel>): Promise<CustomModel | undefined> {
    const existing = this.models.get(id);
    if (!existing) return undefined;
    
    const updated: CustomModel = { ...existing, ...updates };
    this.models.set(id, updated);
    return updated;
  }

  async deleteModel(id: string): Promise<boolean> {
    return this.models.delete(id);
  }

  async getAudits(): Promise<Audit[]> {
    return Array.from(this.audits.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getAudit(id: string): Promise<Audit | undefined> {
    return this.audits.get(id);
  }

  async createAudit(insertAudit: InsertAudit): Promise<Audit> {
    const id = randomUUID();
    const audit: Audit = { 
      ...insertAudit, 
      id,
      modelId: insertAudit.modelId || null,
      categories: insertAudit.categories || null,
      testPrompts: insertAudit.testPrompts || null,
      iterations: insertAudit.iterations || null,
      results: insertAudit.results || null,
      createdAt: insertAudit.createdAt || new Date().toISOString(),
    };
    this.audits.set(id, audit);
    return audit;
  }

  async updateAudit(id: string, updates: Partial<InsertAudit>): Promise<Audit | undefined> {
    const existing = this.audits.get(id);
    if (!existing) return undefined;
    
    const updated: Audit = { ...existing, ...updates };
    this.audits.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
