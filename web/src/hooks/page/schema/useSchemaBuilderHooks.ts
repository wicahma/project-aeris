import { useMemo } from 'react'
import { useAerisStore } from '../../../store/aeris.store'
import { selectDDL, selectValidationError, useSchemaBuilderStore } from '../../../store/global-states/schema-builder.store'

export function useSchemaBuilderHooks() {
  const store = useSchemaBuilderStore()
  const { activeDb } = useAerisStore()
  const validationError = useMemo(() => selectValidationError(store), [store.spec])
  const ddl = useMemo(() => selectDDL(store), [store.spec])
  return { ...store, activeDb, validationError, ddl }
}
