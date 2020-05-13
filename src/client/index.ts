import fetch, { RequestInfo, RequestInit } from "node-fetch";

type FetchFunc = (url: RequestInfo, init?: RequestInit) => Promise<any>;

interface State {
  fetcher: (
    url: RequestInfo,
    init?: RequestInit
  ) => Promise<Task[] & TimeEntrie[]>;
  uri: string;
  fetchFunc?: FetchFunc;
}

export interface Task {
  id: number;
  name: string;
  description: string;
  hourRate: number;
  project: {
    id: number;
    name: string;
    customer: {
      id: number;
      name: string;
    };
  };
  favorite: boolean;
  locked: boolean;
}

export interface TimeEntrie {
  id: number;
  date: string;
  value: number;
  taskId: number;
}

export interface Client {
  getTasks: (accessToken: string) => Promise<Task[]>;
  editFavoriteTasks: (tasks: Task[], accessToken: string) => Promise<Task[]>;
  getTimeEntries: (
    params: {
      fromDateInclusive: string;
      toDateInclusive: string;
    },
    accessToken: string
  ) => Promise<TimeEntrie[]>;
  editTimeEntries: (
    timeEntries: TimeEntrie[],
    accessToken: string
  ) => Promise<TimeEntrie[]>;
}

export default function createAlvtimeClient(
  uri: string,
  fetchFunc = fetch
): Client {
  const state = {
    fetchFunc,
    uri,
    fetcher: async (
      url: RequestInfo,
      init?: RequestInit
    ): Promise<Task[] & TimeEntrie[]> => [],
  };

  const { fetcher } = createFetcher(state);
  state.fetcher = fetcher;

  return {
    ...createGetTasks(state),
    ...createEditFavoriteTasks(state),
    ...createGetTimeEntries(state),
    ...createEditTimeEntries(state),
  };
}

function createGetTasks(state: State) {
  const getTasks = async (accessToken: string) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const url = state.uri + "/api/user/tasks";
    console.log("url: ", url);
    console.log("init: ", { headers });
    return state.fetcher(url, { headers });
  };
  return { getTasks };
}

function createEditFavoriteTasks(state: State) {
  const editFavoriteTasks = async (tasks: Task[], accessToken: string) => {
    const method = "post";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const body = JSON.stringify(tasks);
    const init = { method, headers, body };
    return state.fetcher(state.uri + "/api/user/Tasks", init);
  };
  return {
    editFavoriteTasks,
  };
}

function createGetTimeEntries(state: State) {
  const getTimeEntries = async (
    params: {
      fromDateInclusive: string;
      toDateInclusive: string;
    },
    accessToken: string
  ) => {
    const url = new URL(state.uri + "/api/user/TimeEntries");
    url.search = new URLSearchParams(params).toString();
    const headers = { Authorization: `Bearer ${accessToken}` };
    return state.fetcher(url.toString(), { headers });
  };
  return {
    getTimeEntries,
  };
}

function createEditTimeEntries(state: State) {
  const editTimeEntries = async (
    timeEntries: TimeEntrie[],
    accessToken: string
  ) => {
    const method = "post";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
    const body = JSON.stringify(timeEntries);
    const init = { method, headers, body };
    return state.fetcher(state.uri + "/api/user/TimeEntries", init);
  };
  return {
    editTimeEntries,
  };
}

function createFetcher(state: State) {
  const fetcher = async (url: string, init: RequestInit) => {
    const response = await state.fetchFunc(url, init);
    if (response.status !== 200) {
      throw response.statusText;
    }
    return response.json();
  };

  return {
    fetcher,
  };
}
