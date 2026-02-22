export type WorkerMessage = {
    type: 'INIT' | 'PROCESS';
    payload?: any;
};

export type WorkerResponse = {
    type: 'INIT_COMPLETE' | 'PROGRESS' | 'RESULT' | 'ERROR';
    payload?: any;
};
