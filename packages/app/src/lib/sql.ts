import TauriDatabase, {type QueryResult} from "@tauri-apps/plugin-sql"

export default class Database {
  readonly #db: TauriDatabase

  private constructor(db: TauriDatabase) {
    this.#db = db
  }

  static get(path: string) {
    return new Database(TauriDatabase.get(path))
  }

  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>
  execute(strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult>
  execute(query: string | TemplateStringsArray, ...values: unknown[]) {
    const [sql, bindValues] = _parseQuery(query, values)
    return this.#db.execute(sql, bindValues)
  }

  select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T>
  select<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>
  select<T = unknown>(query: string | TemplateStringsArray, ...values: unknown[]) {
    const [sql, bindValues] = _parseQuery(query, values)
    return this.#db.select<T>(sql, bindValues)
  }

  close(db?: string) {
    return this.#db.close(db)
  }
}

function _parseQuery(
  query: string | TemplateStringsArray,
  values: unknown[],
): [string, unknown[] | undefined] {
  const bindValues = values.map(_normalizeBindValue)
  if (typeof query === "string") {
    return [query, (values[0] as unknown[] | undefined)?.map(_normalizeBindValue)]
  }
  return [String.raw({raw: query}, ...bindValues.map((_, i) => `$${i + 1}`)), bindValues]
}

function _normalizeBindValue(value: unknown) {
  if (value === undefined) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return value
}
