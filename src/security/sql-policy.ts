const stripLeadingComments = (sql: string) =>
  sql.replace(/^(\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/))+/g, "").trim();

const forbidden = /\b(drop|truncate|alter|create\s+(role|user|database|schema|extension)|grant|revoke|copy|vacuum|cluster|reindex|refresh\s+materialized|security\s+definer|set\s+role|reset\s+role|listen|notify|do\s*\$|call)\b/i;
const txControl = /^\s*(begin|start\s+transaction|commit|rollback|savepoint|release)\b/i;

export type WriteOperation = "INSERT" | "UPDATE" | "DELETE";

export function getWriteOperation(sql: string): WriteOperation {
  const q = stripLeadingComments(sql);
  const match = q.match(/^(insert|update|delete)\b/i);
  if (!match) throw new Error("Write tool accepts INSERT, UPDATE, or DELETE only");
  return match[1]!.toUpperCase() as WriteOperation;
}

export function assertReadQuery(sql: string) {
  const q = stripLeadingComments(sql);
  if (!/^(select|with|explain)\b/i.test(q)) throw new Error("Read tool accepts SELECT, WITH, or EXPLAIN only");
  if (forbidden.test(q) || txControl.test(q)) throw new Error("Statement blocked by SQL policy");
  if (/\b(insert|update|delete|merge)\b/i.test(q)) throw new Error("Write statement not allowed in read tool");
}

export function assertWriteQuery(sql: string) {
  const q = stripLeadingComments(sql);
  getWriteOperation(q);
  if (forbidden.test(q) || txControl.test(q)) throw new Error("Statement blocked by SQL policy");
  if (q.includes(";") && q.replace(/;\s*$/, "").includes(";")) throw new Error("Multiple statements are not allowed");
}
