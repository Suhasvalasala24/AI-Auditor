export type Model = {
    id: number;
    model_id: string;
    name: string;
    version: string;
    model_type: string;
    connection_type: string;
    last_audit_status?: string;
};

export type Audit = {
    id: number;
    audit_id: string;
    model_id: number;
    audit_result: string;
    execution_status: string;
    executed_at: string;
};
