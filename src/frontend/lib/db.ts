import sql from "mssql"

const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER || "",
  database: process.env.AZURE_SQL_DATABASE || "",
  user: process.env.AZURE_SQL_USER || "",
  password: process.env.AZURE_SQL_PASSWORD || "",
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config)
  }
  return pool
}

export async function query<T = Record<string, unknown>>(
  queryString: string,
  inputs?: { name: string; type: sql.ISqlTypeFactory; value: unknown }[]
): Promise<sql.IRecordSet<T>> {
  const p = await getPool()
  const request = p.request()
  if (inputs) {
    for (const input of inputs) {
      request.input(input.name, input.type, input.value)
    }
  }
  const result = await request.query<T>(queryString)
  return result.recordset
}

export { sql }
