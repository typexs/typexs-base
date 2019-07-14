export const C_TASKS = 'tasks';
export const XS_TYPE_BINDING_SUBELEM = 'entity_ref_has_subelement';
export const XS_TYPE_BINDING_TASK_GROUP = 'task_group_binding';
export const XS_TYPE_BINDING_TASK_DEPENDS_ON = 'task_dependency_binding';


export const TASKRUN_STATE_NEXT = 'next';
export const TASKRUN_STATE_RUN = 'run';
export const TASKRUN_STATE_DONE = 'done';
export const TASKRUN_STATE_FINISHED = 'finished';
export const TASKRUN_STATE_FINISH_PROMISE = 'finish_promise';
export const TASKRUN_STATE_UPDATE = 'update';

export const K_CLS_TASKS: string = 'tasks';
export const K_CLS_TASK_DESCRIPTORS = 'task_descriptors';


export type TASK_STATES = 'enqueue' | 'proposed' | 'started' | 'stopped' | 'running' | 'errored' | 'request_error';
export type TASK_RUNNER_SPEC = string | { name: string, incomings: any };
