import { create } from 'zustand'

export interface DecisionContext {
  user_name: string
  category: string
  product_ids: string[]
  selected_node_id: string | null
  evidence: Record<string, unknown>
}

interface DecisionContextStore {
  context: DecisionContext
  setUserName: (name: string) => void
  setCategory: (category: string) => void
  setProductIds: (ids: string[]) => void
  setSelectedNode: (nodeId: string | null) => void
  setEvidence: (evidence: Record<string, unknown>) => void
  reset: () => void
}

const initialContext: DecisionContext = {
  user_name: '',
  category: 'all',
  product_ids: [],
  selected_node_id: null,
  evidence: {},
}

export const useDecisionContextStore = create<DecisionContextStore>((set) => ({
  context: initialContext,
  setUserName: (name) =>
    set((state) => ({
      context: { ...state.context, user_name: name },
    })),
  setCategory: (category) =>
    set((state) => ({
      context: { ...state.context, category },
    })),
  setProductIds: (ids) =>
    set((state) => ({
      context: { ...state.context, product_ids: ids },
    })),
  setSelectedNode: (nodeId) =>
    set((state) => ({
      context: { ...state.context, selected_node_id: nodeId },
    })),
  setEvidence: (evidence) =>
    set((state) => ({
      context: { ...state.context, evidence },
    })),
  reset: () =>
    set({
      context: initialContext,
    }),
}))
