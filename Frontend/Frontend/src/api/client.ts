import type {
  Baseline,
  Competitor,
  EventLog,
  Graph,
  Persona,
  Product,
  Scenario,
  SimulationBundle,
} from '@/types'

const BASE_URL = 'http://127.0.0.1:8000'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

/**
 * Thin API surface the rest of the app talks to. Every method hits the
 * backend over HTTP — see seed-data/README.md (outside this repo folder)
 * for the exact contract. Swapping the mock server for the real FastAPI
 * backend is just repointing VITE_API_BASE_URL; no app code changes.
 */
export const api = {
  async getScenario(): Promise<Scenario> {
    return getJson<Scenario>('/scenario')
  },
  async getPersonas(): Promise<Persona[]> {
    return getJson<Persona[]>('/personas')
  },
  async getProducts(): Promise<Product[]> {
    return getJson<Product[]>('/products')
  },
  async getCompetitors(): Promise<Competitor[]> {
    return getJson<Competitor[]>('/competitors')
  },
  async getBaseline(): Promise<Baseline> {
    return getJson<Baseline>('/baseline')
  },
  async getOutcome(): Promise<Baseline> {
    return getJson<Baseline>('/outcome')
  },
  async getEventLog(): Promise<EventLog> {
    return getJson<EventLog>('/event-log')
  },
  async getGraph(): Promise<Graph> {
    return getJson<Graph>('/graph')
  },

  /** Fetches the whole bundle in parallel — used to hydrate the app once. */
  async getBundle(): Promise<SimulationBundle> {
    const [scenario, personas, products, competitors, baseline, outcome, eventLog, graph] =
      await Promise.all([
        api.getScenario(),
        api.getPersonas(),
        api.getProducts(),
        api.getCompetitors(),
        api.getBaseline(),
        api.getOutcome(),
        api.getEventLog(),
        api.getGraph(),
      ])
    return { scenario, personas, products, competitors, baseline, outcome, eventLog, graph }
  },
}
