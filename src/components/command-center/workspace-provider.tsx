"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import type { WorkspaceSnapshot } from "@/lib/command-center/domain";
import {
  LocalBusinessRepository,
  WELCOME_STORAGE_KEY,
  type OpportunityDraft,
  type TaskDraft,
} from "@/lib/command-center/repository";

const CHANGE_EVENT = "nvrtrack-workspace";

interface WorkspaceContextValue {
  ready: boolean;
  workspace: WorkspaceSnapshot | null;
  welcomeVisible: boolean;
  dismissWelcome: () => void;
  createTask: (input: TaskDraft) => void;
  updateTask: (id: string, input: TaskDraft) => void;
  deleteTask: (id: string) => void;
  createOpportunity: (input: OpportunityDraft) => void;
  updateOpportunity: (id: string, input: OpportunityDraft) => void;
  resetWorkspace: () => void;
  exportWorkspace: () => WorkspaceSnapshot | null;
  importWorkspace: (value: unknown) => string | null;
}

interface ClientStore {
  workspace: WorkspaceSnapshot;
  welcomeVisible: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
let repository: LocalBusinessRepository | null = null;
let cachedRaw = "";
let cachedStore: ClientStore | null = null;

function ensureRepository(): LocalBusinessRepository {
  if (!repository) {
    repository = new LocalBusinessRepository(window.localStorage);
    repository.load();
  }
  return repository;
}

function readStore(): ClientStore {
  const repo = ensureRepository();
  return {
    workspace: repo.exportWorkspace(),
    welcomeVisible: window.localStorage.getItem(WELCOME_STORAGE_KEY) !== "1",
  };
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(CHANGE_EVENT, onStoreChange);
}

function getSnapshot(): ClientStore {
  ensureRepository();
  const raw = window.localStorage.getItem("nvrtrack.command-center.workspace.v1") ?? "";
  const welcome = window.localStorage.getItem(WELCOME_STORAGE_KEY) ?? "";
  const key = `${raw}\n${welcome}`;
  if (key !== cachedRaw || !cachedStore) {
    cachedRaw = key;
    cachedStore = readStore();
  }
  return cachedStore;
}

function getServerSnapshot(): ClientStore | null {
  return null;
}

function publish(): void {
  cachedRaw = "";
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<WorkspaceContextValue>(() => {
    return {
      ready: store !== null,
      workspace: store?.workspace ?? null,
      welcomeVisible: store?.welcomeVisible ?? false,
      dismissWelcome() {
        window.localStorage.setItem(WELCOME_STORAGE_KEY, "1");
        publish();
      },
      createTask(input) {
        ensureRepository().createTask(input);
        publish();
      },
      updateTask(id, input) {
        ensureRepository().updateTask(id, input);
        publish();
      },
      deleteTask(id) {
        ensureRepository().deleteTask(id);
        publish();
      },
      createOpportunity(input) {
        ensureRepository().createOpportunity(input);
        publish();
      },
      updateOpportunity(id, input) {
        ensureRepository().updateOpportunity(id, input);
        publish();
      },
      resetWorkspace() {
        ensureRepository().reset();
        publish();
      },
      exportWorkspace() {
        return ensureRepository().exportWorkspace();
      },
      importWorkspace(raw) {
        try {
          ensureRepository().importWorkspace(raw);
          publish();
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : "Import failed.";
        }
      },
    };
  }, [store]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }
  return value;
}
